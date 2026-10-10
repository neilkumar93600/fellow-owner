'use client';

import { clsx } from 'cn';
import { useLayoutEffect, useRef, useState } from 'react';
import { formatNumber } from '@/lib/format';

const DURATION = 600;

/** ease-out-expo, the curve DESIGN.md gives entrances and tickers. */
function easeOutExpo(t: number): number {
  return t >= 1 ? 1 : 1 - 2 ** (-10 * t);
}

/**
 * Magic UI Number Ticker, tuned to DESIGN.md: stat card numbers count up from 0 over 600ms ease-out-expo,
 * once, when the card first mounts. A refetch or a return to the tab shows the new value directly, and
 * reduced motion shows the final value from the start. Figures are tabular; screen readers get the real
 * value once (a visually hidden copy), never the frames in between.
 */
export function NumberTicker({ value, className }: { value: number; className?: string }) {
  const [shown, setShown] = useState(value);
  const done = useRef(false);

  // Layout effect: the first painted frame is already 0, never a flash of the final value.
  useLayoutEffect(() => {
    if (
      done.current ||
      document.hidden ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      done.current = true;
      setShown(value);
      return;
    }
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION);
      setShown(t === 1 ? value : Math.round(value * easeOutExpo(t)));
      if (t < 1) frame = requestAnimationFrame(tick);
      else done.current = true;
    };
    setShown(0);
    frame = requestAnimationFrame(tick);
    // A cleanup before the end (Strict Mode, a new value mid-count) lets the next run count again.
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return (
    <span className={clsx('tabular-nums', className)}>
      <span aria-hidden="true">{formatNumber(shown)}</span>
      <span className="sr-only">{formatNumber(value)}</span>
    </span>
  );
}
