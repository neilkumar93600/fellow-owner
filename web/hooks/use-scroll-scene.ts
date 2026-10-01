'use client';

import { type RefObject, useEffect, useRef } from 'react';

export type SceneMode =
  /** Pinned scene: 0 when the section's top reaches the viewport top, 1 when its bottom reaches the viewport bottom. */
  | 'pin'
  /** Pass-through: 0 when the section's top enters at the bottom, 1 when its bottom leaves at the top. */
  | 'pass';

export interface SceneFrame {
  /** Clamped progress 0..1. */
  progress: number;
  /** Viewport size in CSS px. */
  width: number;
  height: number;
}

/**
 * Scroll-driven scene engine (3d-scroll-website rules): one requestAnimationFrame per tick guarded by a
 * ticking ref, passive listeners, and an IntersectionObserver so off-screen scenes cost nothing.
 * `onFrame` must write to the DOM or a canvas through refs; never set React state on every frame.
 */
export function useScrollScene<T extends HTMLElement>(
  ref: RefObject<T | null>,
  onFrame: (frame: SceneFrame) => void,
  mode: SceneMode = 'pin',
) {
  const callback = useRef(onFrame);
  callback.current = onFrame;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let ticking = false;
    let active = false;
    let frameId = 0;

    const measure = () => {
      ticking = false;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const vw = window.innerWidth;
      let progress: number;
      if (mode === 'pin') {
        const distance = el.offsetHeight - vh;
        progress = distance > 0 ? -rect.top / distance : rect.top <= 0 ? 1 : 0;
      } else {
        progress = (vh - rect.top) / (vh + rect.height);
      }
      callback.current({ progress: Math.min(1, Math.max(0, progress)), width: vw, height: vh });
    };

    const request = () => {
      if (!active || ticking) return;
      ticking = true;
      frameId = requestAnimationFrame(measure);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        active = Boolean(entry?.isIntersecting);
        if (active) request();
      },
      { rootMargin: '25% 0px 25% 0px' },
    );
    observer.observe(el);
    window.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', request, { passive: true });
    active = true;
    request();

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', request);
      window.removeEventListener('resize', request);
      cancelAnimationFrame(frameId);
    };
  }, [ref, mode]);
}

/** Maps progress inside [start, end] to 0..1, clamped. */
export function segment(progress: number, start: number, end: number): number {
  if (end <= start) return progress >= end ? 1 : 0;
  return Math.min(1, Math.max(0, (progress - start) / (end - start)));
}

/** easeOutQuart for hand-driven scroll values. */
export function easeOut(t: number): number {
  return 1 - (1 - t) ** 4;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
