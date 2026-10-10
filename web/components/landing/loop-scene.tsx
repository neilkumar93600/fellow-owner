'use client';

import { useLenis } from 'lenis/react';
import {
  type MotionValue,
  motion,
  useMotionValueEvent,
  useScroll,
  useTransform,
} from 'motion/react';
import { useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import styles from './loop.module.css';
import { LoopCanvas } from './loop-canvas';
import { storyDisclosure, storySteps } from './loop-data';
import { LoopLive } from './loop-live';
import { StoryVisual } from './loop-static';

const COUNT = storySteps.length;
/** Share of the scroll the outgoing card fades out, then the incoming card fades in, just before a boundary. */
const FADE = 0.02;
const pad = (value: number) => String(value).padStart(2, '0');

/** Step `index` owns progress [index / COUNT, (index + 1) / COUNT]; the first and last never fade at the ends. */
function stepRange(index: number) {
  const start = index / COUNT;
  const end = (index + 1) / COUNT;
  return { start, end, first: index === 0, last: index === COUNT - 1 };
}

function StepCard({ index, progress }: { index: number; progress: MotionValue<number> }) {
  const step = storySteps[index];
  const { start, end, first, last } = stepRange(index);
  // Fully shown at its own boundary, so a card always matches the live layer and the recording behind it.
  const input = first
    ? [0, 0.001, end - 2 * FADE, end - FADE]
    : [start - FADE, start, end - 2 * FADE, last ? end - 0.001 : end - FADE];
  const opacity = useTransform(progress, input, [first ? 1 : 0, 1, 1, last ? 1 : 0]);
  const y = useTransform(progress, input, [first ? 0 : 28, 0, 0, last ? 0 : -20]);
  const visibility = useTransform(opacity, (value) => (value < 0.01 ? 'hidden' : 'visible'));
  if (!step) return null;

  return (
    <motion.article
      className={cn('glass-strong', styles.card)}
      style={{ opacity, y, visibility }}
      aria-labelledby={`story-${step.id}`}
    >
      <p className="text-caption text-ink-soft">
        {pad(index + 1)} / {pad(COUNT)} · {step.name}
        {step.day ? <span className="font-normal"> · {step.day}</span> : null}
      </p>
      <h3
        id={`story-${step.id}`}
        className="mt-1.5 font-display text-[1.75rem] leading-[1.05] text-balance text-ink md:text-[2.25rem]"
      >
        {step.title}
      </h3>
      <p className="mt-2.5 text-body text-pretty text-ink-soft">{step.line}</p>
      <div className={styles.visual}>
        <StoryVisual id={step.id} />
      </div>
    </motion.article>
  );
}

/**
 * How it works (round 4 spec §3, "Both"): pinned for about 300vh. One scroll progress drives a blurred
 * recording of the product behind (canvas), the crisp live product layer in front, and one frosted card
 * per step with a rail that jumps to each step.
 */
export function LoopScene() {
  const trackRef = useRef<HTMLDivElement>(null);
  const lenis = useLenis();
  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ['start start', 'end end'],
  });
  const [active, setActive] = useState(0);

  useMotionValueEvent(scrollYProgress, 'change', (value) => {
    setActive(Math.min(COUNT - 1, Math.max(0, Math.floor(value * COUNT))));
  });

  function goTo(index: number) {
    const track = trackRef.current;
    if (!track) return;
    const top = track.getBoundingClientRect().top + window.scrollY;
    const target = top + (track.offsetHeight - window.innerHeight) * ((index + 0.4) / COUNT);
    if (lenis) lenis.scrollTo(target);
    else window.scrollTo({ top: target });
  }

  return (
    <div ref={trackRef} className={styles.track}>
      <div className={styles.sticky}>
        <LoopCanvas progress={scrollYProgress} />
        <div className={styles.shade} aria-hidden="true" />

        <div className={styles.frame}>
          <header className={cn('glass-strong', styles.head)}>
            <p className="text-caption text-ink-soft">Example: a travel creator (demo)</p>
            <h2
              id="loop-title"
              className="mt-1 font-display text-[1.75rem] leading-[1.05] text-ink md:text-[2.5rem]"
            >
              How it works: <em>from follower to featured</em>
            </h2>
            <p className="mt-2 text-caption font-normal text-ink-soft">{storyDisclosure}</p>
          </header>

          <LoopLive progress={scrollYProgress} className={styles.live} />

          <nav aria-label="Steps" className={styles.rail}>
            <ol>
              {storySteps.map((step, index) => (
                <li key={step.id}>
                  <button
                    type="button"
                    className={cn('glass-chip', styles.chip)}
                    aria-current={active === index ? 'step' : undefined}
                    onClick={() => goTo(index)}
                  >
                    <span className={styles.chipDot} aria-hidden="true" />
                    <span className="tabular">{pad(index + 1)}</span>
                    <span className={styles.chipName}>{step.name}</span>
                  </button>
                </li>
              ))}
            </ol>
          </nav>

          <div className={styles.cards}>
            {storySteps.map((step, index) => (
              <StepCard key={step.id} index={index} progress={scrollYProgress} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
