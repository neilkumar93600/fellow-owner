'use client';

import type * as React from 'react';
import { useEffect, useRef } from 'react';

/** Brief §7: the cursor parallax is eased and capped at 12px. */
const LEAN_MAX = 12;
const LEAN_EASE = 0.08;
const LEAN_QUERY = '(hover: hover) and (pointer: fine) and (min-width: 1024px)';

/**
 * Client island for the demo CTA and the FAQ. The server renders everything complete and still (no
 * JavaScript, reduced motion); this only adds motion, by writing attributes and two custom properties:
 *
 * - [data-cta-reveal] blocks that start below the fold get data-armed, then data-inview when they enter.
 *   The CSS modules key their entrances on those two attributes.
 * - data-play="off" while the stage is off-screen, so CSS loops (the orbs' bob) pause.
 * - With `lean`, --lx / --ly (px, -12..12) follow the mouse over the stage, eased in one RAF loop that
 *   stops once it settles. They are written on the [data-cta-lean] element (the orbs layer), so each frame
 *   restyles only that small subtree. Desktop with a fine pointer only; never for touch or reduced motion.
 */
export function CtaStage({
  className,
  children,
  lean = false,
}: {
  className?: string;
  children: React.ReactNode;
  lean?: boolean;
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

    if (lean) cleanups.push(attachLean(root));

    return () => {
      for (const fn of cleanups) fn();
    };
  }, [lean]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

/** Eased cursor lean: reads the pointer over the root, writes --lx / --ly on [data-cta-lean]. Returns its cleanup. */
function attachLean(root: HTMLElement): () => void {
  const query = window.matchMedia(LEAN_QUERY);
  const target = root.querySelector<HTMLElement>('[data-cta-lean]') ?? root;
  let frame = 0;
  let running = false;
  let pointer: { x: number; y: number } | null = null;
  let x = 0;
  let y = 0;

  const step = () => {
    let tx = 0;
    let ty = 0;
    if (pointer) {
      const rect = root.getBoundingClientRect();
      const nx = ((pointer.x - rect.left) / rect.width) * 2 - 1;
      const ny = ((pointer.y - rect.top) / rect.height) * 2 - 1;
      tx = clamp(nx) * LEAN_MAX;
      ty = clamp(ny) * LEAN_MAX;
    }
    x += (tx - x) * LEAN_EASE;
    y += (ty - y) * LEAN_EASE;
    const settled = Math.abs(tx - x) < 0.02 && Math.abs(ty - y) < 0.02;
    if (settled) {
      x = tx;
      y = ty;
    }
    target.style.setProperty('--lx', x.toFixed(2));
    target.style.setProperty('--ly', y.toFixed(2));
    if (settled) running = false;
    else frame = requestAnimationFrame(step);
  };

  const kick = () => {
    if (running) return;
    running = true;
    frame = requestAnimationFrame(step);
  };

  const onMove = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse') return;
    pointer = { x: event.clientX, y: event.clientY };
    kick();
  };
  const onLeave = () => {
    pointer = null;
    kick();
  };

  let attached = false;
  const sync = () => {
    if (query.matches && !attached) {
      root.addEventListener('pointermove', onMove, { passive: true });
      root.addEventListener('pointerleave', onLeave, { passive: true });
      attached = true;
    } else if (!query.matches && attached) {
      root.removeEventListener('pointermove', onMove);
      root.removeEventListener('pointerleave', onLeave);
      attached = false;
      onLeave();
    }
  };
  sync();
  query.addEventListener('change', sync);

  return () => {
    query.removeEventListener('change', sync);
    root.removeEventListener('pointermove', onMove);
    root.removeEventListener('pointerleave', onLeave);
    cancelAnimationFrame(frame);
  };
}

function clamp(n: number): number {
  return Math.min(1, Math.max(-1, n));
}
