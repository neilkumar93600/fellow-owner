'use client';

import { useLenis } from 'lenis/react';
import {
  MotionConfig,
  type MotionValue,
  motion,
  useInView,
  useMotionValue,
  useMotionValueEvent,
  useScroll,
  useTransform,
} from 'motion/react';
import type * as React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useMediaQuery, usePrefersReducedMotion } from '@/hooks/use-media-query';
import { cn } from '@/lib/utils';
import styles from './connect.module.css';
import { STEP_VISUALS, type StepVisualId } from './connect-visuals';

const STEPS: { id: StepVisualId; title: string; line: string }[] = [
  { id: 'voice', title: 'Reply in your voice', line: 'Your AI twin drafts. You hit send.' },
  { id: 'want', title: 'What fans want', line: 'Repeated asks become your next ideas.' },
  {
    id: 'challenge',
    title: 'Run a challenge',
    line: 'Fans enter, your twin shortlists, you pick.',
  },
  { id: 'heart', title: 'A heart from you', line: 'One tap tells a fan you noticed.' },
  { id: 'featured', title: 'Your idea made it', line: 'Featured crews get credited by name.' },
  {
    id: 'spotlight',
    title: 'Fan spotlight',
    line: 'Rising fans get a weekly shout-out you approve.',
  },
];

const COUNT = STEPS.length;
const LAST = COUNT - 1;
const INDEX = STEPS.map((_, index) => index);
const pad = (value: number) => String(value).padStart(2, '0');

/** Pinned: the row holds still for the first and last quarter of each step's scroll, so it rests with a card on the content edge. */
const HOLD = 0.25;

/** Piecewise-linear lookup: where `value` falls along the ascending `xs`, read off `ys`. */
function lookup(xs: number[], ys: number[], value: number) {
  for (let i = 1; i < xs.length; i++) {
    const x0 = xs[i - 1] ?? 0;
    const x1 = xs[i] ?? 0;
    if (value > x1 && i < xs.length - 1) continue;
    const f = x1 > x0 ? Math.min(1, Math.max(0, (value - x0) / (x1 - x0))) : 1;
    return (ys[i - 1] ?? 0) + f * ((ys[i] ?? 0) - (ys[i - 1] ?? 0));
  }
  return ys[0] ?? 0;
}

/**
 * Swipe mode: which step (fractional) a scroll offset shows. The last cards can't reach the content edge
 * and share the end offset, so the end belongs to the last step.
 */
function stepAt(stops: number[], offset: number) {
  const end = stops[LAST] ?? 0;
  const keep = INDEX.filter((index) => index === LAST || (stops[index] ?? 0) < end - 1);
  return lookup(
    keep.map((index) => stops[index] ?? 0),
    keep,
    offset,
  );
}

/** The pager marks the card arriving at the content edge: between stops that is the next card, fully in view. */
function activeAt(pos: number) {
  const near = Math.round(pos);
  return Math.abs(pos - near) < 0.02 ? near : Math.ceil(pos);
}

/**
 * Pin: a wide window with a fine pointer, room to spare and motion allowed. Vertical scroll through a tall
 * track slides the row of steps sideways inside a sticky stage. Anything else gets the native row: a
 * horizontal scroll-snap track (swipe, trackpad, arrow keys) with the same dots.
 */
const PIN_QUERY =
  '(min-width: 1024px) and (min-height: 760px) and (pointer: fine) and (prefers-reduced-motion: no-preference)';

function Step({
  index,
  pos,
  dim,
  on,
}: {
  index: number;
  pos: MotionValue<number>;
  dim: MotionValue<number>;
  on: boolean;
}) {
  const step = STEPS[index];
  // Distance from the step on the content edge: neighbours rest at 55% and a touch smaller.
  const opacity = useTransform([pos, dim], ([p, d]: number[]) => {
    const offset = Math.min(Math.abs((p ?? 0) - index), 1);
    return 1 - offset * 0.45 * (d ?? 0);
  });
  const scale = useTransform([pos, dim], ([p, d]: number[]) => {
    const offset = Math.min(Math.abs((p ?? 0) - index), 1);
    return 1 - offset * 0.05 * (d ?? 0);
  });
  if (!step) return null;
  const Visual = STEP_VISUALS[step.id];

  return (
    <motion.li
      className={cn('glass', styles.card)}
      style={{ opacity, scale }}
      aria-labelledby={`connect-step-${step.id}`}
    >
      <div className={styles.cardHead}>
        <span className={cn('tabular', styles.cardNum)} aria-hidden="true">
          {pad(index + 1)}
        </span>
        <h3 id={`connect-step-${step.id}`} className={styles.cardTitle}>
          {step.title}
        </h3>
        <p className={styles.cardLine}>{step.line}</p>
      </div>
      <Visual on={on} />
    </motion.li>
  );
}

export function ConnectSteps() {
  const trackRef = useRef<HTMLDivElement>(null);
  const rowRef = useRef<HTMLOListElement>(null);
  const pin = useMediaQuery(PIN_QUERY);
  const reduced = usePrefersReducedMotion();
  const lenis = useLenis();

  const { scrollYProgress } = useScroll({ target: trackRef, offset: ['start start', 'end end'] });
  const { scrollXProgress } = useScroll({ container: rowRef });
  /** Whichever drives the row: page scroll when pinned, the row's own scroll otherwise. */
  const progress = useMotionValue(0);
  /** The step on the content edge, fractional between stops. */
  const pos = useMotionValue(0);
  const dim = useMotionValue(0);
  const x = useMotionValue(0);
  /** Each card's row offset when it sits on the content edge, capped where the last card meets the gutter. */
  const stops = useRef<number[]>([]);

  const [active, setActive] = useState(0);
  const [reached, setReached] = useState(0);
  const seen = useInView(rowRef, { amount: 0.35, once: true });

  const track = useCallback(() => {
    const row = rowRef.current;
    if (!row || !stops.current.length) return;
    let at: number;
    if (pin) {
      progress.set(scrollYProgress.get());
      const t = scrollYProgress.get() * LAST;
      const i = Math.min(LAST - 1, Math.max(0, Math.floor(t)));
      const f = Math.min(1, Math.max(0, (t - i - HOLD) / (1 - 2 * HOLD)));
      at = i + f * f * (3 - 2 * f);
      x.set(-lookup(INDEX, stops.current, at));
    } else {
      progress.set(scrollXProgress.get());
      at = stepAt(stops.current, row.scrollLeft);
      x.set(0);
    }
    pos.set(at);
    const index = Math.min(LAST, Math.max(0, activeAt(at)));
    setActive(index);
    setReached((max) => Math.max(max, index));
  }, [pin, progress, pos, x, scrollYProgress, scrollXProgress]);
  useMotionValueEvent(scrollYProgress, 'change', () => {
    if (pin) track();
  });
  useMotionValueEvent(scrollXProgress, 'change', () => {
    if (!pin) track();
  });

  // The row travels until the last card meets the right gutter (no dead space); re-measured on resize.
  useEffect(() => {
    dim.set(reduced ? 0 : 1);
    const row = rowRef.current;
    if (!row) return;
    const measure = () => {
      const cards = Array.from(row.children) as HTMLElement[];
      const first = cards[0];
      const last = cards[LAST];
      if (!first || !last) return;
      const lead = first.offsetLeft;
      const end = Math.max(0, last.offsetLeft + last.offsetWidth + lead - row.clientWidth);
      stops.current = cards.map((card) => Math.min(end, card.offsetLeft - lead));
      track();
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(row);
    return () => observer.disconnect();
  }, [reduced, dim, track]);

  const goTo = (index: number) => {
    const row = rowRef.current;
    const first = row?.firstElementChild as HTMLElement | null;
    const card = row?.children[index] as HTMLElement | undefined;
    if (!row || !first || !card) return;
    if (pin) {
      const el = trackRef.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY;
      const target = top + (el.offsetHeight - window.innerHeight) * (index / LAST);
      if (lenis) lenis.scrollTo(target, { duration: 1 });
      else window.scrollTo({ top: target, behavior: 'smooth' });
      return;
    }
    row.scrollTo({
      left: card.offsetLeft - first.offsetLeft,
      behavior: reduced ? 'auto' : 'smooth',
    });
  };

  return (
    <MotionConfig transition={reduced ? { duration: 0 } : undefined}>
      <div
        ref={trackRef}
        className={styles.track}
        data-pin={pin ? '' : undefined}
        style={{ '--steps': COUNT } as React.CSSProperties}
      >
        <div className={styles.stage}>
          <div className={styles.rail}>
            <p className={cn('tabular', styles.counter)} aria-hidden="true">
              <b>{pad(active + 1)}</b> / {pad(COUNT)}
            </p>
            <span className={styles.progress} aria-hidden="true">
              <motion.span
                className={styles.progressFill}
                style={{ scaleX: progress, originX: 0 }}
              />
            </span>
            <nav aria-label="Steps" className={styles.dots}>
              {STEPS.map((step, index) => (
                <button
                  key={step.id}
                  type="button"
                  className={styles.dot}
                  aria-label={`Step ${index + 1}: ${step.title}`}
                  aria-current={active === index ? 'step' : undefined}
                  onClick={() => goTo(index)}
                >
                  <span className={styles.dotMark} />
                </button>
              ))}
            </nav>
          </div>

          <div className={styles.viewport}>
            <motion.ol
              ref={rowRef}
              className={styles.row}
              style={{ x }}
              tabIndex={pin ? undefined : 0}
              aria-label="Six ways to connect, scroll sideways"
            >
              {STEPS.map((step, index) => (
                <Step
                  key={step.id}
                  index={index}
                  pos={pos}
                  dim={dim}
                  on={reduced || (seen && index <= reached)}
                />
              ))}
            </motion.ol>
          </div>
        </div>
      </div>
    </MotionConfig>
  );
}
