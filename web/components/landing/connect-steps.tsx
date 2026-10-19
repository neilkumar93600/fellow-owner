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
const pad = (value: number) => String(value).padStart(2, '0');

/**
 * Pin: a wide window with a fine pointer, room to spare and motion allowed. Vertical scroll through a tall
 * track slides the row of steps sideways inside a sticky stage. Anything else gets the native row: a
 * horizontal scroll-snap track (swipe, trackpad, arrow keys) with the same dots.
 */
const PIN_QUERY =
  '(min-width: 1024px) and (min-height: 760px) and (pointer: fine) and (prefers-reduced-motion: no-preference)';

function Step({
  index,
  progress,
  dim,
  on,
}: {
  index: number;
  progress: MotionValue<number>;
  dim: MotionValue<number>;
  on: boolean;
}) {
  const step = STEPS[index];
  // Distance from the active step: neighbours rest at 55% and a touch smaller.
  const opacity = useTransform([progress, dim], ([p, d]: number[]) => {
    const offset = Math.min(Math.abs((p ?? 0) * LAST - index), 1);
    return 1 - offset * 0.45 * (d ?? 0);
  });
  const scale = useTransform([progress, dim], ([p, d]: number[]) => {
    const offset = Math.min(Math.abs((p ?? 0) * LAST - index), 1);
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
  const distance = useMotionValue(0);
  const dim = useMotionValue(0);
  const x = useTransform([scrollYProgress, distance], ([p, d]: number[]) => -(p ?? 0) * (d ?? 0));

  const [active, setActive] = useState(0);
  const [reached, setReached] = useState(0);
  const seen = useInView(rowRef, { amount: 0.35, once: true });

  const track = useCallback(
    (value: number) => {
      progress.set(value);
      const index = Math.min(LAST, Math.max(0, Math.round(value * LAST)));
      setActive(index);
      setReached((max) => Math.max(max, index));
    },
    [progress],
  );
  useMotionValueEvent(scrollYProgress, 'change', (value) => {
    if (pin) track(value);
  });
  useMotionValueEvent(scrollXProgress, 'change', (value) => {
    if (!pin) track(value);
  });

  // The pinned row slides until the last card meets the right gutter (no dead space); re-measured on resize.
  useEffect(() => {
    dim.set(reduced ? 0 : 1);
    const row = rowRef.current;
    if (!row) return;
    const measure = () => {
      const first = row.firstElementChild as HTMLElement | null;
      const last = row.lastElementChild as HTMLElement | null;
      const end = last ? last.offsetLeft + last.offsetWidth : 0;
      const lead = first?.offsetLeft ?? 0;
      distance.set(pin ? Math.max(0, end + lead - row.clientWidth) : 0);
      track(pin ? scrollYProgress.get() : scrollXProgress.get());
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(row);
    return () => observer.disconnect();
  }, [pin, reduced, distance, dim, scrollYProgress, scrollXProgress, track]);

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
                  progress={progress}
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
