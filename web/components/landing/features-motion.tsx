'use client';

import type * as React from 'react';
import { useEffect, useRef } from 'react';

const EASE_OUT_QUART = (t: number) => 1 - (1 - t) ** 4;
const COUNT_MS = 1400;

/**
 * Client island for the features bento. The server renders every tile complete and still (no JavaScript,
 * reduced motion); this only adds the small motions, and only to things that start off-screen:
 *
 * - [data-reveal] cells fade and rise 16px when they enter (CSS, keyed on data-armed / data-inview).
 * - Micro states inside a tile (toggles, fit bar, sparkline, chip selection) play from the same attributes.
 * - [data-count-to] numbers count up once with ease-out-quart, written straight to the DOM.
 * - data-play on the stage pauses the CSS 3D objects while the section is off-screen.
 */
export function FeaturesStage({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const play = new IntersectionObserver(
      ([entry]) => {
        root.dataset.play = entry?.isIntersecting ? 'on' : 'off';
      },
      { rootMargin: '160px 0px' },
    );
    play.observe(root);

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return () => play.disconnect();
    }

    const frames = new Set<number>();
    const countUp = (el: HTMLElement) => {
      const to = Number(el.dataset.countTo);
      if (!Number.isFinite(to)) return;
      const format = new Intl.NumberFormat('en-US');
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / COUNT_MS);
        el.textContent = format.format(Math.round(to * EASE_OUT_QUART(t)));
        if (t < 1) frames.add(requestAnimationFrame(tick));
      };
      frames.add(requestAnimationFrame(tick));
    };

    const seen = new WeakSet<Element>();
    const reveal = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const el = entry.target as HTMLElement;
          const counters = el.querySelectorAll<HTMLElement>('[data-count-to]');
          if (!seen.has(el)) {
            seen.add(el);
            // Already on screen at load: leave it as rendered, no entrance.
            if (entry.isIntersecting) {
              reveal.unobserve(el);
              continue;
            }
            el.dataset.armed = '';
            for (const c of counters) c.textContent = '0';
            continue;
          }
          if (entry.isIntersecting) {
            el.dataset.inview = '';
            for (const c of counters) countUp(c);
            reveal.unobserve(el);
          }
        }
      },
      { threshold: 0.3 },
    );
    for (const el of root.querySelectorAll('[data-reveal]')) reveal.observe(el);

    return () => {
      play.disconnect();
      reveal.disconnect();
      for (const id of frames) cancelAnimationFrame(id);
    };
  }, []);

  return (
    <div ref={ref} className={className} data-play="on">
      {children}
    </div>
  );
}
