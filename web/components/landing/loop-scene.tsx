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
import { createFrameCache, type DecodedFrame, type FrameCache } from './loop-frames';

/*
 * Scroll timeline, in pinned progress (0 at pin start, 1 at pin end):
 *   0 to 0.04     hold frame 2 (a few far-off followers) under the intro heading
 *   0.025 to 0.06 the intro heading lifts away
 *   0.04 to 0.92  scrub frames 2 to 120; the stage follows the frame range it owns
 *   0.92 to 1     hold the last frame: the Featured card and its click count
 * Frame 1 is an out-of-focus plate with nothing on it, so the scrub starts one frame in.
 *
 * Frames 94 to 106 (zero-based 93 to 105) are where the generated clip melts the white cluster into the slab:
 * smeared, half-transparent spheres, an edge-on plank and stains on the floor. The scrub never shows or
 * loads them. It dissolves frame 93 into frame 107 (the clean slab) over MELT_BLEND frames' worth of scroll
 * instead, so every shown frame keeps its own step.
 */
const FIRST_FRAME = 1;
const FRAMES_START = 0.04;
const FRAMES_END = 0.92;
const INTRO_OUT: [number, number] = [0.025, 0.06];
const STAGES_START = 0.06;
/** Last clean frame before the melt and first clean frame after it (zero-based). */
const MELT_FROM = 92;
const MELT_TO = 106;
const MELT_SPAN = MELT_TO - MELT_FROM;
/** Scroll the dissolve takes, in frame steps (about 125px at 1440x900). */
const MELT_BLEND = 5;
/** Scrub length in frame steps: one per shown frame, plus the dissolve. */
const STEPS = LOOP_FRAME_COUNT - FIRST_FRAME - MELT_SPAN + MELT_BLEND;
/** The frames the scrub draws (and so the only ones it fetches). */
const SHOWN: readonly number[] = Array.from(
  { length: LOOP_FRAME_COUNT - FIRST_FRAME },
  (_, i) => i + FIRST_FRAME,
).filter((frame) => frame <= MELT_FROM || frame >= MELT_TO);
/**
 * Featured card fades in as the clean slab turns to face the camera (frame positions, zero-based), so the
 * slab is never seen blank for long while Action is the active stage.
 */
const PAYOFF_IN: [number, number] = [108.5, 113.5];
const CLICKS_FROM = 114;
const DPR_CAP = 2;
const FETCHES_IN_FLIGHT = 6;
/**
 * Phones: the clip is 16:9 in a portrait window, so cover-fit already crops hard. The 1.3x zoom is
 * capped so at least this share of the frame's width stays visible, which keeps the lifted card
 * (27% of the width) whole.
 */
const PHONE_MIN_VISIBLE = 0.36;
/** Narrowest card face that still holds readable text; below it the card lifts off the slab. */
const FACE_MIN_WIDTH = 300;
const LIFTED_CARD_MAX = 340;
/** Narrowest lifted card; below it the cqw-typeset text gets too small to read. */
const LIFTED_CARD_MIN = 240;
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

/**
 * Continuous frame position (zero-based) for a pinned progress. Inside the melt it runs across the skipped
 * frames at the dissolve's pace, so stage timing (in frames) still reads naturally.
 */
function frameProgress(progress: number): number {
  const step = FIRST_FRAME + segment(progress, FRAMES_START, FRAMES_END) * STEPS;
  if (step <= MELT_FROM) return step;
  if (step < MELT_FROM + MELT_BLEND)
    return MELT_FROM + ((step - MELT_FROM) / MELT_BLEND) * MELT_SPAN;
  return step - MELT_BLEND + MELT_SPAN;
}

function frameIndex(progress: number): number {
  return Math.min(LOOP_FRAME_COUNT - 1, Math.floor(frameProgress(progress)));
}

/** Inverse of frameProgress: the pinned progress at which a frame position is reached. */
function progressAt(frame: number): number {
  let step = frame;
  if (frame > MELT_FROM && frame < MELT_TO) {
    step = MELT_FROM + ((frame - MELT_FROM) / MELT_SPAN) * MELT_BLEND;
  } else if (frame >= MELT_TO) step = frame + MELT_BLEND - MELT_SPAN;
  return FRAMES_START + ((step - FIRST_FRAME) / STEPS) * (FRAMES_END - FRAMES_START);
}

/** What the canvas shows at a frame position: one frame, or the dissolve across the melt. */
function drawTarget(position: number): { from: number; to: number; mix: number } {
  if (position > MELT_FROM && position < MELT_TO) {
    const t = (position - MELT_FROM) / MELT_SPAN;
    // Smoothstep, quantised so a slow scroll does not redraw for invisible alpha changes.
    return { from: MELT_FROM, to: MELT_TO, mix: Math.round(t * t * (3 - 2 * t) * 48) / 48 };
  }
  const frame = Math.min(LOOP_FRAME_COUNT - 1, Math.floor(position));
  return { from: frame, to: frame, mix: 0 };
}

/** The frame the decode window centres on. */
function focusFrame(progress: number): number {
  const target = drawTarget(frameProgress(progress));
  return target.mix >= 0.5 ? target.to : target.from;
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  frame: DecodedFrame,
  width: number,
  height: number,
  zoom: number,
) {
  const box = coverBox(frame.width / frame.height || LOOP_FRAME_RATIO, width, height, zoom);
  ctx.drawImage(frame.image, box.x, box.y, box.w, box.h);
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
  const railRef = useRef<HTMLFieldSetElement>(null);
  const loaderRef = useRef<HTMLDivElement>(null);
  const loaderFillRef = useRef<HTMLSpanElement>(null);
  const loaderValueRef = useRef<HTMLSpanElement>(null);
  const payoffRef = useRef<HTMLDivElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);

  // Hot values live in refs; React state only changes when the stage or the load status changes.
  const cacheRef = useRef<FrameCache | null>(null);
  /** Every frame's bytes have settled, so the decode window can run. */
  const fetchedRef = useRef(false);
  /** The scene is within a screen of the viewport and the tab is visible: bitmaps may stay decoded. */
  const residentRef = useRef(false);
  const readyRef = useRef(false);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  /** Media window size (CSS px), its offset inside the shell, DPR and zoom. */
  const sizeRef = useRef({ w: 0, h: 0, x: 0, y: 0, dpr: 1, zoom: 1 });
  const progressRef = useRef(0);
  const directionRef = useRef(1);
  /** What the canvas holds now (source frames and mix), so a scroll tick only redraws on a change. */
  const drawnRef = useRef('');
  const stageRef = useRef(-1);
  const introOutRef = useRef(-1);
  const revealRef = useRef(-1);
  const clicksRef = useRef(-1);
  const payoffBoxRef = useRef<Box | null>(null);
  const payoffFromRef = useRef(0.96);

  const [active, setActive] = useState(-1);
  const [status, setStatus] = useState<LoadStatus>('idle');

  /**
   * Draws the frame (or the melt dissolve) for a progress from already-decoded bitmaps. Never waits on a
   * decode: while the exact frame is still decoding, its nearest decoded neighbour stands in, and the scene
   * repaints when the real one lands. Returns whether the canvas holds a frame.
   */
  const paint = useCallback((progress: number): boolean => {
    const ctx = ctxRef.current;
    const cache = cacheRef.current;
    const { w, h, dpr, zoom } = sizeRef.current;
    if (!ctx || !cache || w === 0 || h === 0) return false;
    const target = drawTarget(frameProgress(progress));
    // Nothing decoded yet (the window just moved): keep whatever the canvas shows.
    const from = cache.nearest(target.from);
    if (!from) return drawnRef.current !== '';
    const to = target.mix > 0 ? cache.nearest(target.to) : null;
    const blend = to && to.frame !== from.frame ? target.mix : 0;
    const key = blend > 0 && to ? `${from.frame}>${to.frame}@${blend}` : String(from.frame);
    if (key === drawnRef.current) return true;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = 1;
    drawCover(ctx, blend >= 1 && to ? to.decoded : from.decoded, w, h, zoom);
    if (blend > 0 && blend < 1 && to) {
      ctx.globalAlpha = blend;
      drawCover(ctx, to.decoded, w, h, zoom);
      ctx.globalAlpha = 1;
    }
    drawnRef.current = key;
    if (!readyRef.current) {
      readyRef.current = true;
      setStatus('ready');
    }
    return true;
  }, []);

  /** Points the decode window at the current frame while the scene is resident. */
  const focus = useCallback((progress: number) => {
    const cache = cacheRef.current;
    if (!cache || !fetchedRef.current || !residentRef.current) return;
    cache.focus(focusFrame(progress), directionRef.current);
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
      if (width >= LIFTED_CARD_MIN) {
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

    if (!box) {
      // Short, wide screens (a laptop at 200% zoom): there is no room above or below the copy, so the card
      // stands beside it instead, in the column between the copy and the rail, at the full height.
      let left = EDGE;
      let right = shellW - EDGE;
      const cx = (face.left + face.right) / 2;
      for (const o of obstacles) {
        if ((o.left + o.right) / 2 < cx) left = Math.max(left, o.right + GAP);
        else right = Math.min(right, o.left - GAP);
      }
      let width = Math.min(LIFTED_CARD_MAX, right - left);
      if (width >= LIFTED_CARD_MIN) {
        el.style.width = `${width}px`;
        el.dataset.compact = 'true';
        let height = el.offsetHeight;
        const room = shellH - 2 * EDGE;
        if (height > room) {
          width = (width * room) / height;
          height = room;
        }
        if (width >= LIFTED_CARD_MIN) {
          box = {
            x: clamp(cx - width / 2, left, right - width),
            y: clamp((face.top + face.bottom) / 2 - height / 2, EDGE, shellH - EDGE - height),
            w: width,
            h: height,
          };
          payoffFromRef.current = 0.96;
        }
      }
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
    if (!ctxRef.current) ctxRef.current = canvas.getContext('2d', { alpha: false });
    // Setting the canvas size resets the context state, smoothing included: set it again every time.
    if (ctxRef.current) {
      ctxRef.current.imageSmoothingEnabled = true;
      ctxRef.current.imageSmoothingQuality = 'high';
    }
    drawnRef.current = '';
    paint(progressRef.current);
    layoutPayoff();
  }, [paint, layoutPayoff]);

  const onFrame = useCallback(
    ({ progress }: SceneFrame) => {
      if (progress !== progressRef.current)
        directionRef.current = progress > progressRef.current ? 1 : -1;
      progressRef.current = progress;

      const out = easeOut(segment(progress, INTRO_OUT[0], INTRO_OUT[1]));
      if (out !== introOutRef.current && introRef.current) {
        introOutRef.current = out;
        introRef.current.style.opacity = String(1 - out);
        introRef.current.style.transform = out > 0 ? `translate3d(0, ${-24 * out}px, 0)` : '';
      }

      focus(progress);
      paint(progress);

      const stage = stageAt(progress, frameIndex(progress));
      if (stage !== stageRef.current) {
        stageRef.current = stage;
        setActive(stage);
      }

      paintPayoff(progress);
    },
    [focus, paint, paintPayoff],
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

  // Fetch every shown frame's bytes before scrubbing starts. Begins when the browser is idle after load, or
  // when the section comes within a screen and a half, whichever is first. Decoding is separate and windowed
  // (loop-frames.ts): only frames near the current one are decoded, off the main thread, and the window is
  // released while the scene is more than a screen away or the tab is hidden. Reduced motion never loads.
  useEffect(() => {
    if (reduced || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const scene = sceneRef.current;
    if (!scene) return;
    let started = false;
    let cancelled = false;
    let timer = 0;
    let idle = 0;
    const controller = new AbortController();
    const cache = createFrameCache(SHOWN, () => paint(progressRef.current));
    cacheRef.current = cache;

    const setBar = (fraction: number) => {
      const percent = Math.round(fraction * 100);
      if (loaderFillRef.current) loaderFillRef.current.style.transform = `scaleX(${fraction})`;
      if (loaderValueRef.current) loaderValueRef.current.textContent = `${percent}%`;
      loaderRef.current?.setAttribute('aria-valuenow', String(percent));
    };

    const start = () => {
      if (started || cancelled) return;
      started = true;
      starter.disconnect();
      setStatus('loading');
      const set: LoopFrameSet = isPhone() ? 'mobile' : 'desktop';
      const queue = [...SHOWN];
      let settled = 0;
      const worker = async () => {
        for (let frame = queue.shift(); frame !== undefined; frame = queue.shift()) {
          try {
            const response = await fetch(loopFrameSrc(set, frame), { signal: controller.signal });
            if (!response.ok) throw new Error(`Frame ${frame}: ${response.status}`);
            cache.add(frame, await response.blob());
          } catch {
            // A missing frame is skipped; the scrub shows its nearest neighbour.
            if (controller.signal.aborted) return;
          }
          settled += 1;
          setBar(settled / SHOWN.length);
        }
      };
      Promise.all(Array.from({ length: FETCHES_IN_FLIGHT }, worker)).then(() => {
        if (cancelled) return;
        if (cache.size === 0) {
          setStatus('failed');
          return;
        }
        fetchedRef.current = true;
        focus(progressRef.current);
      });
    };

    const starter = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) start();
      },
      { rootMargin: '150% 0px 150% 0px' },
    );
    starter.observe(scene);

    // Residency: decoded bitmaps live only while the scene is within a screen and the tab is visible.
    let near = false;
    const settle = () => {
      const resident = near && document.visibilityState !== 'hidden';
      if (resident === residentRef.current) return;
      residentRef.current = resident;
      if (resident) {
        focus(progressRef.current);
      } else {
        cache.release();
        drawnRef.current = '';
      }
    };
    const resident = new IntersectionObserver(
      ([entry]) => {
        near = Boolean(entry?.isIntersecting);
        settle();
      },
      { rootMargin: '100% 0px 100% 0px' },
    );
    resident.observe(scene);
    document.addEventListener('visibilitychange', settle);

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
      controller.abort();
      starter.disconnect();
      resident.disconnect();
      document.removeEventListener('visibilitychange', settle);
      window.removeEventListener('load', scheduleIdle);
      window.clearTimeout(timer);
      if (idle && 'cancelIdleCallback' in window) window.cancelIdleCallback(idle);
      cache.dispose();
      cacheRef.current = null;
      fetchedRef.current = false;
      residentRef.current = false;
    };
  }, [reduced, paint, focus]);

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
            {/* Eager (it is tiny) so a visitor landing mid-loop never sees an empty shell; low priority. */}
            <NextImage
              ref={posterRef}
              src={LOOP_POSTER}
              alt=""
              fill
              sizes="100vw"
              loading="eager"
              fetchPriority="low"
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
                <span className="block">One link.</span>
                <span className="block">Five stages.</span>
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

          {/* Progress rail: bottom on phones, top right from 768. Scrubber buttons, so a group, not a nav. */}
          <fieldset ref={railRef} aria-label="Loop stages" className={styles.rail}>
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
          </fieldset>

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
