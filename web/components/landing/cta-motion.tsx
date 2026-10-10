'use client';

import type * as React from 'react';
import { useEffect, useRef } from 'react';

/**
 * Client island for the demo CTA, the FAQ and the connect and trust sections. The server renders everything
 * complete and still (no JavaScript, reduced motion); this only adds motion, by writing attributes:
 *
 * - [data-cta-reveal] blocks that start below the fold get data-armed, then data-inview when they enter.
 *   The CSS modules key their entrances on those two attributes.
 * - data-play="off" while the stage is off-screen, so CSS loops (the typing dots, the countdown) pause.
 */
export function CtaStage({
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
    const cleanups: Array<() => void> = [];

    const play = new IntersectionObserver(
      ([entry]) => {
        root.dataset.play = entry?.isIntersecting ? 'on' : 'off';
      },
      { rootMargin: '120px 0px' },
    );
    play.observe(root);
    cleanups.push(() => play.disconnect());

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return () => {
        for (const fn of cleanups) fn();
      };
    }

    // Entrances: only for blocks that are still below the fold, so nothing on screen ever blinks.
    const reveal = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          (entry.target as HTMLElement).dataset.inview = '';
          reveal.unobserve(entry.target);
        }
      },
      { rootMargin: '0px 0px -12% 0px' },
    );
    const fold = window.innerHeight * 0.92;
    for (const el of root.querySelectorAll<HTMLElement>('[data-cta-reveal]')) {
      if (el.getBoundingClientRect().top < fold) continue;
      el.dataset.armed = '';
      reveal.observe(el);
    }
    cleanups.push(() => reveal.disconnect());

    return () => {
      for (const fn of cleanups) fn();
    };
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
