'use client';

import { type MotionValue, useMotionValueEvent } from 'motion/react';
import { useEffect, useRef } from 'react';
import styles from './loop.module.css';
import { createFrameCache, type FrameCache } from './loop-frames';

/** The blurred product recording (round 4 spec §3): 5 acts of 24 frames, 1280x800. */
const FRAME_COUNT = 120;
const EAGER = 12;
/**
 * CSS px per canvas pixel. The recording is drawn this coarse and the browser's smooth upscale blurs it
 * (about a 40px blur at this size) for free, so only colour shapes survive: no readable product text
 * behind the live layer, and no per-frame CSS filter.
 */
const COARSE = 20;
const POSTER = '/frames/product/poster.webp';
const SHOWN = Array.from({ length: FRAME_COUNT }, (_, index) => index);
const frameUrl = (index: number) =>
  `/frames/product/frame_${String(index + 1).padStart(4, '0')}.webp`;

/**
 * The loop's background layer: scrubs the recording with the same scroll progress as the live layer, so
 * act i plays behind step i. Bytes load once (12 eager, the rest on idle); loop-frames keeps only a small
 * decoded window and the whole window is released while the canvas is off screen. Never fetches under
 * reduced motion (LoopStatic covers that case); poster.webp is drawn, equally coarse, until frame 1 decodes.
 */
export function LoopCanvas({ progress }: { progress: MotionValue<number> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engine = useRef<{
    cache: FrameCache;
    update: (value: number) => void;
  } | null>(null);

  useMotionValueEvent(progress, 'change', (value) => engine.current?.update(value));

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let target = 0;
    let last = progress.get();
    let drawn = -1;
    let visible = false;
    let raf = 0;

    const draw = (image: CanvasImageSource, width: number, height: number) => {
      const scale = Math.max(canvas.width / width, canvas.height / height);
      const w = width * scale;
      const h = height * scale;
      context.drawImage(image, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
    };
    // The poster stands in (drawn just as coarse) until the first frame decodes.
    const poster = new Image();
    poster.src = POSTER;
    const POSTER_DRAWN = -2;

    const paint = () => {
      raf = 0;
      const hit = cache.nearest(target);
      if (!hit) {
        if (drawn === -1 && poster.complete && poster.naturalWidth) {
          draw(poster, poster.naturalWidth, poster.naturalHeight);
          drawn = POSTER_DRAWN;
        }
        return;
      }
      if (hit.frame === drawn) return;
      draw(hit.decoded.image, hit.decoded.width, hit.decoded.height);
      drawn = hit.frame;
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(paint);
    };
    const cache = createFrameCache(SHOWN, schedule);
    poster.onload = schedule;

    const update = (value: number) => {
      // floor(p * 120), not round(p * 119): act i is exactly [i / 5, (i + 1) / 5), like liveStepAt.
      target = Math.min(FRAME_COUNT - 1, Math.floor(Math.max(0, value) * FRAME_COUNT));
      const direction = value < last ? -1 : 1;
      last = value;
      if (!visible) return;
      cache.focus(target, direction);
      schedule();
    };
    engine.current = { cache, update };

    const resize = () => {
      canvas.width = Math.max(1, Math.ceil(canvas.clientWidth / COARSE));
      canvas.height = Math.max(1, Math.ceil(canvas.clientHeight / COARSE));
      // Resizing resets the context; average the whole frame on the way down so it never shimmers.
      context.imageSmoothingQuality = 'high';
      drawn = -1;
      schedule();
    };
    resize();
    const resizer = new ResizeObserver(resize);
    resizer.observe(canvas);

    const watcher = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting);
      if (visible) update(progress.get());
      else {
        cache.release();
        drawn = -1;
      }
    });
    watcher.observe(canvas);

    const aborter = new AbortController();
    const load = (index: number) =>
      fetch(frameUrl(index), { signal: aborter.signal })
        .then((response) => (response.ok ? response.blob() : null))
        .then((blob) => blob && cache.add(index, blob))
        .catch(() => {});
    const idle = (run: () => void) =>
      'requestIdleCallback' in window ? requestIdleCallback(run) : setTimeout(run, 200);
    Promise.all(SHOWN.slice(0, EAGER).map(load)).then(() =>
      idle(() => {
        // ponytail: fire the rest at once (1.4MB total); the browser queues the requests.
        if (!aborter.signal.aborted) for (const index of SHOWN.slice(EAGER)) load(index);
      }),
    );

    return () => {
      aborter.abort();
      poster.onload = null;
      cancelAnimationFrame(raf);
      resizer.disconnect();
      watcher.disconnect();
      cache.dispose();
      engine.current = null;
    };
  }, [progress]);

  // biome-ignore lint/a11y/noAriaHiddenOnFocusable: a canvas is not focusable; the recording is decorative.
  return <canvas ref={canvasRef} aria-hidden="true" className={styles.canvas} />;
}
