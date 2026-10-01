'use client';

import { Pause, Play } from 'lucide-react';
import type * as React from 'react';
import { useEffect, useRef, useState } from 'react';

/**
 * Client island for the showcase strip. The marquee itself is a CSS transform animation, so it runs (and
 * reads) without JavaScript; this adds three things:
 *
 * - a visible Pause / Play control (WCAG 2.2.2), since hover and focus pauses do not reach touch users;
 * - data-offscreen, which pauses the row while the strip is out of view;
 * - focus that stays visible: when Tab lands on a card that sits under an edge fade or off-screen, the
 *   row's CSS animation is moved (Web Animations currentTime) so that card sits in the middle. The loop
 *   keeps the real list's start between 50vw and 50vw minus one list (showcase.module.css), so every real
 *   card, the first included, can reach the centre. Hover and focus-within already pause the row in CSS,
 *   so it stays put while the card has focus.
 *
 * Under reduced motion the row is a static scroll-snap row (CSS) and the control is hidden.
 */
export function ShowcaseStage({
  className,
  headClassName,
  sideClassName,
  controlClassName,
  controlTextClassName,
  heading,
  line,
  children,
}: {
  className?: string;
  headClassName?: string;
  sideClassName?: string;
  controlClassName?: string;
  controlTextClassName?: string;
  heading: React.ReactNode;
  line: React.ReactNode;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    setReady(true);
    const root = ref.current;
    if (!root) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) delete root.dataset.offscreen;
        else root.dataset.offscreen = '';
      },
      { rootMargin: '120px 0px' },
    );
    io.observe(root);

    const onFocusIn = (event: FocusEvent) => {
      const target = event.target as HTMLElement | null;
      // Keyboard focus only: a mouse click is about to navigate, so leave the row where it is.
      if (!target?.matches(':focus-visible')) return;
      const card = target?.closest<HTMLElement>('[data-marquee-item]');
      const track = card?.closest<HTMLElement>('[data-marquee-track]');
      const row = track?.parentElement;
      if (!card || !track || !row) return;
      const animation = track.getAnimations()[0];
      if (!animation) return; // reduced motion: a plain scroll row, the browser scrolls it into view.

      const rowBox = row.getBoundingClientRect();
      const cardBox = card.getBoundingClientRect();
      // Clear of the edge fade (min(12%, 160px) in CSS), plus a little air.
      const margin = Math.min(rowBox.width * 0.12, 160) + 16;
      if (cardBox.left >= rowBox.left + margin && cardBox.right <= rowBox.right - margin) return;

      const copies = Number(track.dataset.copies) || 3;
      const group = track.scrollWidth / copies;
      const duration = Number(animation.effect?.getComputedTiming().duration) || 0;
      if (!group || !duration) return;

      // The keyframes run translateX from 50vw - group to 50vw - 2 * group (one list per loop).
      const start = window.innerWidth / 2 - group;
      // The translate that puts the card's centre on the row's centre (offsetLeft is within the track).
      const centre = rowBox.width / 2 - (card.offsetLeft + card.offsetWidth / 2);
      const progress = Math.min(0.9999, Math.max(0, (start - centre) / group));
      const reverse = getComputedStyle(track).animationDirection === 'reverse';
      animation.currentTime = (reverse ? 1 - progress : progress) * duration;
    };
    root.addEventListener('focusin', onFocusIn);

    return () => {
      io.disconnect();
      root.removeEventListener('focusin', onFocusIn);
    };
  }, []);

  return (
    <div ref={ref} className={className} data-paused={paused ? '' : undefined}>
      <div className={headClassName}>
        {heading}
        <div className={sideClassName}>
          {line}
          {ready ? (
            <button type="button" className={controlClassName} onClick={() => setPaused((p) => !p)}>
              {paused ? (
                <Play size={16} strokeWidth={1.5} aria-hidden="true" />
              ) : (
                <Pause size={16} strokeWidth={1.5} aria-hidden="true" />
              )}
              <span className={controlTextClassName}>{paused ? 'Play' : 'Pause'}</span>
              <span className="sr-only"> the moving project rows</span>
            </button>
          ) : null}
        </div>
      </div>
      {children}
    </div>
  );
}
