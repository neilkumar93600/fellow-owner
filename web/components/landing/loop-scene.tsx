'use client';

import { useLenis } from 'lenis/react';
import NextImage from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { usePrefersReducedMotion } from '@/hooks/use-media-query';
import { easeOut, type SceneFrame, segment, useScrollScene } from '@/hooks/use-scroll-scene';
import styles from './loop.module.css';
import {
  LOOP_CARD_FACE,
  LOOP_FRAME_COUNT,
  LOOP_FRAME_RATIO,
  LOOP_PHONE_MAX,
  LOOP_PHONE_ZOOM,
  LOOP_POSTER,
  type LoopFrameSet,
  loopFeatured,
  loopFrameSrc,
  loopStages,
} from './loop-data';
import { LoopFeatured } from './loop-featured';

/*
 * Scroll timeline, in pinned progress (0 at pin start, 1 at pin end):
 *   0 to 0.04     hold frame 2 (a few far-off followers) under the intro heading
 *   0.025 to 0.06 the intro heading lifts away
 *   0.04 to 0.92  scrub frames 2 to 120; the stage follows the frame range it owns
 *   0.92 to 1     hold the last frame: the Featured card and its click count
 * Frame 1 is an out-of-focus plate with nothing on it, so the scrub starts one frame in.
 */
const FIRST_FRAME = 1;
const FRAMES_START = 0.04;
const FRAMES_END = 0.92;
const INTRO_OUT: [number, number] = [0.025, 0.06];
const STAGES_START = 0.06;
/** Featured card fades in while the slab turns to face the camera (frame positions, zero-based). */
const PAYOFF_IN: [number, number] = [112.5, 118.5];
const CLICKS_FROM = 116;
const DPR_CAP = 2;
/**
 * Phones: the clip is 16:9 in a portrait window, so cover-fit already crops hard. The 1.3x zoom is
 * capped so at least this share of the frame's width stays visible, which keeps the lifted card
 * (27% of the width) whole.
 */
const PHONE_MIN_VISIBLE = 0.36;
/** Narrowest card face that still holds readable text; below it the card lifts off the slab. */
const FACE_MIN_WIDTH = 300;
const LIFTED_CARD_MAX = 340;
const EDGE = 16;
const GAP = 14;

type LoadStatus = 'idle' | 'loading' | 'ready' | 'failed';

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Edges {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/** Cover-fit (like object-fit: cover), centred, with an optional zoom on top. */
function coverBox(ratio: number, width: number, height: number, zoom: number): Box {
  let w = width;
  let h = width / ratio;
  if (h < height) {
    h = height;
    w = height * ratio;
  }
  w *= zoom;
  h *= zoom;
  return { x: (width - w) / 2, y: (height - h) / 2, w, h };
}

function isPhone(): boolean {
  return window.innerWidth <= LOOP_PHONE_MAX;
}

function zoomFor(width: number, height: number): number {
  if (!isPhone() || width === 0) return 1;
  const cover = coverBox(LOOP_FRAME_RATIO, width, height, 1);
  return Math.max(1, Math.min(LOOP_PHONE_ZOOM, width / (PHONE_MIN_VISIBLE * cover.w)));
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Continuous frame position (zero-based) for a pinned progress. */
function frameProgress(progress: number): number {
  return (
    FIRST_FRAME + segment(progress, FRAMES_START, FRAMES_END) * (LOOP_FRAME_COUNT - FIRST_FRAME)
  );
}

function frameIndex(progress: number): number {
  return Math.min(LOOP_FRAME_COUNT - 1, Math.floor(frameProgress(progress)));
}

/** Inverse of frameProgress: the pinned progress at which a frame position is reached. */
function progressAt(frame: number): number {
  const t = (frame - FIRST_FRAME) / (LOOP_FRAME_COUNT - FIRST_FRAME);
  return FRAMES_START + t * (FRAMES_END - FRAMES_START);
}

function stageAt(progress: number, index: number): number {
  if (progress < STAGES_START) return -1;
  for (let i = loopStages.length - 1; i >= 0; i -= 1) {
    const stage = loopStages[i];
    if (stage && index >= stage.firstFrame) return i;
  }
  return 0;
}

/** Pinned progress at which a stage reads best (used by the rail). */
function stageTarget(index: number): number {
  if (index >= loopStages.length - 1) return 0.97;
  const stage = loopStages[index];
  if (!stage) return 0;
  return progressAt((Math.max(stage.firstFrame, FIRST_FRAME + 2) + stage.lastFrame + 1) / 2);
}

/** An element's edges relative to the shell. */
function edgesIn(el: Element | null, origin: DOMRect): Edges | null {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 || r.height === 0) return null;
  return {
    left: r.left - origin.left,
    right: r.right - origin.left,
    top: r.top - origin.top,
    bottom: r.bottom - origin.top,
  };
}

const pad = (value: number) => String(value).padStart(2, '0');

export function LoopScene() {
  const reduced = usePrefersReducedMotion();
  const lenis = useLenis();

  const sceneRef = useRef<HTMLDivElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const posterRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const introRef = useRef<HTMLDivElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLElement>(null);
  const loaderRef = useRef<HTMLDivElement>(null);
  const loaderFillRef = useRef<HTMLSpanElement>(null);
  const loaderValueRef = useRef<HTMLSpanElement>(null);
  const payoffRef = useRef<HTMLDivElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);

  // Hot values live in refs; React state only changes when the stage or the load status changes.
  const framesRef = useRef<HTMLImageElement[]>([]);
  const okRef = useRef<boolean[]>([]);
  const readyRef = useRef(false);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  /** Media window size (CSS px), its offset inside the shell, DPR and zoom. */
  const sizeRef = useRef({ w: 0, h: 0, x: 0, y: 0, dpr: 1, zoom: 1 });
  const progressRef = useRef(0);
  const drawnRef = useRef(-1);
  const stageRef = useRef(-1);
  const introOutRef = useRef(-1);
  const revealRef = useRef(-1);
  const clicksRef = useRef(-1);
  const payoffBoxRef = useRef<Box | null>(null);
  const payoffFromRef = useRef(0.96);

  const [active, setActive] = useState(-1);
  const [status, setStatus] = useState<LoadStatus>('idle');

  const draw = useCallback((index: number) => {
    const ctx = ctxRef.current;
    const { w, h, dpr, zoom } = sizeRef.current;
    if (!ctx || w === 0 || h === 0) return;
    let source = index;
    if (!okRef.current[source]) {
      // A frame that failed to load falls back to its nearest loaded neighbour.
      for (let offset = 1; offset < LOOP_FRAME_COUNT; offset += 1) {
        if (okRef.current[index - offset]) {
          source = index - offset;
          break;
        }
        if (okRef.current[index + offset]) {
          source = index + offset;
          break;
        }
      }
    }
    const img = framesRef.current[source];
    if (!img || !okRef.current[source]) return;
    const box = coverBox(img.naturalWidth / img.naturalHeight || LOOP_FRAME_RATIO, w, h, zoom);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.drawImage(img, box.x, box.y, box.w, box.h);
    drawnRef.current = index;
  }, []);

  /** Writes the Featured card's reveal and the click count for the current progress. */
  const paintPayoff = useCallback((progress: number) => {
    const el = payoffRef.current;
    const box = payoffBoxRef.current;
    if (!el) return;
    const reveal = box ? easeOut(segment(frameProgress(progress), PAYOFF_IN[0], PAYOFF_IN[1])) : 0;
    if (reveal !== revealRef.current) {
      revealRef.current = reveal;
      el.style.opacity = String(reveal);
      el.style.visibility = reveal > 0 ? 'visible' : 'hidden';
      if (box) {
        const from = payoffFromRef.current;
        const lift = (1 - reveal) * 20;
        const scale = from + (1 - from) * reveal;
        el.style.transform = `translate3d(${box.x}px, ${box.y + lift}px, 0) scale(${scale})`;
      }
    }
    const climb = easeOut(segment(progress, progressAt(CLICKS_FROM), 0.985));
    const clicks = Math.round(climb * loopFeatured.clicks);
    if (clicks !== clicksRef.current && countRef.current) {
      clicksRef.current = clicks;
      countRef.current.textContent = clicks.toLocaleString('en-US');
      el.style.setProperty('--climb', climb.toFixed(3));
    }
  }, []);

  /**
   * Places the Featured card. Where the slab's face is wide enough, the card sits on it, clear of the
   * copy and the rail; otherwise (phones, or a face mostly under the copy) it lifts off the slab at a
   * readable width. Runs on resize only.
   */
  const layoutPayoff = useCallback(() => {
    const shell = shellRef.current;
    const el = payoffRef.current;
    if (!shell || !el) return;
    const size = sizeRef.current;
    const shellW = shell.clientWidth;
    const shellH = shell.clientHeight;
    const cover = coverBox(LOOP_FRAME_RATIO, size.w, size.h, size.zoom);
    const face: Edges = {
      left: size.x + cover.x + LOOP_CARD_FACE.left * cover.w,
      right: size.x + cover.x + LOOP_CARD_FACE.right * cover.w,
      top: size.y + cover.y + LOOP_CARD_FACE.top * cover.h,
      bottom: size.y + cover.y + LOOP_CARD_FACE.bottom * cover.h,
    };
    const faceW = face.right - face.left;
    const inset = faceW * 0.07;
    const origin = shell.getBoundingClientRect();
    const obstacles = [
      edgesIn(surfaceRef.current, origin),
      edgesIn(railRef.current, origin),
    ].filter((edges): edges is Edges => edges !== null);

    let box: Box | null = null;
    el.style.height = 'auto';
    delete el.dataset.compact;

    if (faceW - 2 * inset >= FACE_MIN_WIDTH) {
      const region: Edges = {
        left: Math.max(face.left + inset, EDGE),
        right: Math.min(face.right - inset, shellW - EDGE),
        top: Math.max(face.top + inset, EDGE),
        bottom: Math.min(face.bottom - inset, shellH - EDGE),
      };
      for (const o of obstacles) {
        if (o.right <= region.left || o.left >= region.right) continue;
        if (o.bottom <= region.top || o.top >= region.bottom) continue;
        // Step clear of the obstacle along whichever axis keeps more of the face.
        const above = (o.top + o.bottom) / 2 < shellH / 2;
        const vTop = above ? Math.max(region.top, o.bottom + GAP) : region.top;
        const vBottom = above ? region.bottom : Math.min(region.bottom, o.top - GAP);
        const onLeft = (o.left + o.right) / 2 < (region.left + region.right) / 2;
        const hLeft = onLeft ? Math.max(region.left, o.right + GAP) : region.left;
        const hRight = onLeft ? region.right : Math.min(region.right, o.left - GAP);
        const verticalArea = (region.right - region.left) * (vBottom - vTop);
        const horizontalArea = (hRight - hLeft) * (region.bottom - region.top);
        if (horizontalArea >= verticalArea) {
          region.left = hLeft;
          region.right = hRight;
        } else {
          region.top = vTop;
          region.bottom = vBottom;
        }
      }
      const regionW = region.right - region.left;
      const regionH = region.bottom - region.top;
      el.style.width = `${Math.max(regionW, 0)}px`;
      const natural = el.offsetHeight;
      const width = natural > regionH ? (regionW * regionH) / natural : regionW;
      if (width >= FACE_MIN_WIDTH - 20) {
        box = { x: region.left + (regionW - width) / 2, y: region.top, w: width, h: regionH };
        payoffFromRef.current = 0.96;
      }
    }

    if (!box) {
      // The face is too small or too covered for readable text: the card lifts off the slab at a
      // readable width, centred on it, clear of whatever copy or rail it would run into.
      let width = Math.min(LIFTED_CARD_MAX, shellW - 2 * EDGE);
      const x = clamp((face.left + face.right) / 2 - width / 2, EDGE, shellW - EDGE - width);
      el.style.width = `${width}px`;
      let height = el.offsetHeight;
      let minTop = EDGE;
      let maxBottom = shellH - EDGE;
      for (const o of obstacles) {
        if (o.right <= x || o.left >= x + width) continue;
        if ((o.top + o.bottom) / 2 < shellH / 2) minTop = Math.max(minTop, o.bottom + GAP);
        else maxBottom = Math.min(maxBottom, o.top - GAP);
      }
      // Short screens (in-app browsers): drop the team row and chart first, then shrink the card to the
      // room there is (it is typeset in cqw, so it scales as a whole).
      const room = maxBottom - minTop;
      if (height > room) {
        el.dataset.compact = 'true';
        height = el.offsetHeight;
      }
      if (height > room) {
        width = (width * room) / height;
        height = room;
      }
      if (width >= 240) {
        const cy = (face.top + face.bottom) / 2;
        box = {
          x: clamp((face.left + face.right) / 2 - width / 2, EDGE, shellW - EDGE - width),
          y: clamp(cy - height / 2, minTop, maxBottom - height),
          w: width,
          h: height,
        };
      }
      payoffFromRef.current = clamp(faceW / width, 0.6, 0.96);
    }

    if (box) {
      el.style.width = `${box.w}px`;
      el.style.height = `${box.h}px`;
    }
    payoffBoxRef.current = box;
    revealRef.current = -1;
    paintPayoff(progressRef.current);
  }, [paintPayoff]);

  /** DPR-aware canvas sizing (capped at 2), then redraw: resizing clears the bitmap. */
  const resize = useCallback(() => {
    const media = mediaRef.current;
    const canvas = canvasRef.current;
    if (!media || !canvas) return;
    const w = media.clientWidth;
    const h = media.clientHeight;
    const dpr = Math.min(DPR_CAP, window.devicePixelRatio || 1);
    const zoom = zoomFor(w, h);
    sizeRef.current = { w, h, x: media.offsetLeft, y: media.offsetTop, dpr, zoom };
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    if (posterRef.current) posterRef.current.style.transform = zoom === 1 ? '' : `scale(${zoom})`;
    if (!ctxRef.current) {
      ctxRef.current = canvas.getContext('2d', { alpha: false });
      if (ctxRef.current) ctxRef.current.imageSmoothingQuality = 'high';
    }
    if (readyRef.current) draw(Math.max(0, drawnRef.current));
    layoutPayoff();
  }, [draw, layoutPayoff]);

  const onFrame = useCallback(
    ({ progress }: SceneFrame) => {
      progressRef.current = progress;

      const out = easeOut(segment(progress, INTRO_OUT[0], INTRO_OUT[1]));
      if (out !== introOutRef.current && introRef.current) {
        introOutRef.current = out;
        introRef.current.style.opacity = String(1 - out);
        introRef.current.style.transform = out > 0 ? `translate3d(0, ${-24 * out}px, 0)` : '';
      }

      const index = frameIndex(progress);
      if (readyRef.current && index !== drawnRef.current) draw(index);

      const stage = stageAt(progress, index);
      if (stage !== stageRef.current) {
        stageRef.current = stage;
        setActive(stage);
      }

      paintPayoff(progress);
    },
    [draw, paintPayoff],
  );

  useScrollScene(sceneRef, onFrame, 'pin');

  // Size the canvas and keep the Featured card placed as the stage, the copy or the rail change size.
  useEffect(() => {
    const observer = new ResizeObserver(() => resize());
    for (const el of [shellRef.current, mediaRef.current, surfaceRef.current, railRef.current]) {
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [resize]);

  // Preload every frame before scrubbing starts. Begins when the browser is idle after load, or when the
  // section comes within a screen and a half, whichever is first. Reduced motion never loads frames.
  useEffect(() => {
    if (reduced || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const scene = sceneRef.current;
    if (!scene) return;
    let started = false;
    let cancelled = false;
    let timer = 0;
    let idle = 0;
    const images: HTMLImageElement[] = [];

    const setBar = (fraction: number) => {
      const percent = Math.round(fraction * 100);
      if (loaderFillRef.current) loaderFillRef.current.style.transform = `scaleX(${fraction})`;
      if (loaderValueRef.current) loaderValueRef.current.textContent = `${percent}%`;
      loaderRef.current?.setAttribute('aria-valuenow', String(percent));
    };

    const start = () => {
      if (started || cancelled) return;
      started = true;
      observer.disconnect();
      setStatus('loading');
      const set: LoopFrameSet = isPhone() ? 'mobile' : 'desktop';
      okRef.current = new Array(LOOP_FRAME_COUNT).fill(false);
      let settled = 0;
      let loaded = 0;
      const finish = (index: number, ok: boolean) => {
        if (cancelled) return;
        okRef.current[index] = ok;
        settled += 1;
        if (ok) loaded += 1;
        setBar(settled / LOOP_FRAME_COUNT);
        if (settled < LOOP_FRAME_COUNT) return;
        if (loaded === 0) {
          setStatus('failed');
          return;
        }
        readyRef.current = true;
        draw(frameIndex(progressRef.current));
        setStatus('ready');
      };
      for (let i = 0; i < LOOP_FRAME_COUNT; i += 1) {
        const img = new window.Image();
        img.decoding = 'async';
        img.onload = () => finish(i, true);
        img.onerror = () => finish(i, false);
        img.src = loopFrameSrc(set, i);
        images.push(img);
      }
      framesRef.current = images;
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) start();
      },
      { rootMargin: '150% 0px 150% 0px' },
    );
    observer.observe(scene);

    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } })
      .connection;
    const scheduleIdle = () => {
      timer = window.setTimeout(() => {
        if ('requestIdleCallback' in window)
          idle = window.requestIdleCallback(start, { timeout: 4000 });
        else start();
      }, 1200);
    };
    if (!connection?.saveData) {
      if (document.readyState === 'complete') scheduleIdle();
      else window.addEventListener('load', scheduleIdle, { once: true });
    }

    return () => {
      cancelled = true;
      observer.disconnect();
      window.removeEventListener('load', scheduleIdle);
      window.clearTimeout(timer);
      if (idle && 'cancelIdleCallback' in window) window.cancelIdleCallback(idle);
      for (const img of images) {
        img.onload = null;
        img.onerror = null;
      }
    };
  }, [reduced, draw]);

  const goToStage = useCallback(
    (index: number) => {
      const scene = sceneRef.current;
      if (!scene) return;
      const top = scene.getBoundingClientRect().top + window.scrollY;
      const y = top + stageTarget(index) * (scene.offsetHeight - window.innerHeight);
      if (lenis) lenis.scrollTo(y, { duration: 1.4 });
      else window.scrollTo({ top: y, behavior: 'smooth' });
    },
    [lenis],
  );

  const loading = status === 'idle' || status === 'loading';

  return (
    <div ref={sceneRef} className="relative h-[320vh] md:h-[400vh] lg:h-[450vh]">
      <div className="sticky top-0 h-svh p-2 sm:p-3 lg:p-4">
        <div ref={shellRef} className={styles.shell}>
          {/* The clip is decorative: the stage copy carries its meaning in text. */}
          <div ref={mediaRef} aria-hidden="true" className={styles.media}>
            <NextImage
              ref={posterRef}
              src={LOOP_POSTER}
              alt=""
              fill
              sizes="100vw"
              className={styles.poster}
            />
            <canvas ref={canvasRef} className={styles.canvas} data-ready={status === 'ready'} />
            <div className={styles.wash} />
          </div>

          <div ref={payoffRef} aria-hidden="true" className={styles.payoff}>
            <LoopFeatured countRef={countRef} />
          </div>

          {/* Copy slot: the intro heading, then the stage surface in the same place. */}
          <div className={styles.slot}>
            <div ref={introRef} className={styles.intro}>
              <p className="eyebrow">The loop</p>
              <h2
                id="loop-title"
                className="mt-5 text-[2.25rem] leading-[1.02] font-medium tracking-[-0.035em] text-ink md:text-section"
              >
                <span className="block">From followers</span>
                <span className="block">to fellow owners.</span>
              </h2>
            </div>

            <div ref={surfaceRef} className={styles.surface} data-visible={active >= 0}>
              <span className={styles.demo}>Demo</span>
              <ol aria-label="The five stages" className={styles.stages}>
                {loopStages.map((stage, index) => (
                  <li key={stage.id} className={styles.stage} data-active={active === index}>
                    <span className={styles.stageIndex}>
                      {pad(index + 1)} / {pad(loopStages.length)}
                    </span>
                    <h3 className={styles.stageNameMask}>
                      <span className={styles.stageName}>{stage.name}</span>
                    </h3>
                    <p className={styles.stageLine}>{stage.line}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          {/* Progress rail: bottom on phones, top right from 768. */}
          <nav ref={railRef} aria-label="Loop stages" className={styles.rail}>
            <ol className={styles.railList}>
              {loopStages.map((stage, index) => {
                const state = index === active ? 'active' : index < active ? 'done' : 'next';
                return (
                  <li key={stage.id}>
                    <button
                      type="button"
                      className={styles.railButton}
                      data-state={state}
                      aria-current={state === 'active' ? 'step' : undefined}
                      onClick={() => goToStage(index)}
                    >
                      <span aria-hidden="true" className={styles.railDot}>
                        {index + 1}
                      </span>
                      <span className={styles.railLabel}>{stage.name}</span>
                      <span aria-hidden="true" className={styles.railIndex}>
                        {pad(index + 1)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>

          {/* Real preload progress; the poster shows underneath until every frame is in. */}
          <div className={styles.loaderWrap}>
            <div
              ref={loaderRef}
              role="progressbar"
              aria-label="Loading the animation"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={0}
              aria-hidden={!loading}
              className={styles.loader}
              data-hidden={!loading}
            >
              <span>Loading scene</span>
              <span className={styles.loaderTrack}>
                <span ref={loaderFillRef} className={styles.loaderFill} />
              </span>
              <span ref={loaderValueRef} className={styles.loaderValue}>
                0%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
