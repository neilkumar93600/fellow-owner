'use client';

import {
  type MotionValue,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useTransform,
} from 'motion/react';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { CommunityGrid } from '@/components/bio/community-grid';
import { CreatorHeader } from '@/components/bio/creator-header';
import { cn } from '@/components/ui/cn';
import { segment } from '@/hooks/use-scroll-scene';
import { BrowserFrame, PhoneFrame } from './device-frames';
import { LIVE_ROOMS, LIVE_SPACE, LIVE_URLS } from './loop-live-data';

/** Five steps: followers, communities, idea, crew, featured (the order of storySteps). */
export const LIVE_STEP_COUNT = LIVE_URLS.length;

/** Step `i` owns progress [i / 5, (i + 1) / 5]; 1 stays on the last step. */
export function liveStepAt(progress: number): number {
  return Math.min(LIVE_STEP_COUNT - 1, Math.max(0, Math.floor(progress * LIVE_STEP_COUNT)));
}

/** How far the browser page scrolls inside one step, in layout px: the page reads as being used. */
const DRIFT = 72;
const BIO = 'mx-auto flex max-w-[792px] flex-col gap-8 p-8 @container';

/**
 * Step 1 is what the server renders; steps 2 to 5 (loop-live-steps.tsx) load as the scene nears, well
 * before the scroll reaches step 2. Their boundaries exist only on the client, so the server HTML is unchanged.
 */
const loadLater = () => import('./loop-live-steps');
const LaterBrowserPage = lazy(() => loadLater().then((mod) => ({ default: mod.LaterBrowserPage })));
const LaterPhonePage = lazy(() => loadLater().then((mod) => ({ default: mod.LaterPhonePage })));

function BrowserPage({ step }: { step: number }) {
  if (step > 0)
    return (
      <Suspense fallback={null}>
        <LaterBrowserPage step={step} />
      </Suspense>
    );
  return (
    <div className={BIO}>
      <CreatorHeader
        space={LIVE_SPACE}
        cta={{ href: '#', label: 'Join a room' }}
        nameAs="p"
        priority={false}
      />
      <CommunityGrid handle={LIVE_SPACE.handle} communities={LIVE_ROOMS} joinedIds={[]} />
    </div>
  );
}

function PhonePage({ step }: { step: number }) {
  if (step > 0)
    return (
      <Suspense fallback={null}>
        <LaterPhonePage step={step} />
      </Suspense>
    );
  return (
    <CreatorHeader
      space={LIVE_SPACE}
      cta={{ href: '#', label: 'Join a room' }}
      nameAs="p"
      priority={false}
    />
  );
}

/** One step of the live layer, without scroll: a browser with the step's page and a phone on the right. */
export function LoopLiveStep({
  step,
  drift,
  className,
}: {
  /** 0 to 4. */
  step: number;
  /** Optional in-step scroll of the browser page (layout px, negative moves up). */
  drift?: MotionValue<number>;
  className?: string;
}) {
  const reduce = useReducedMotion();
  // The first render matches the server (no entrance); only later step changes fade in, never under reduced motion.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const enter = mounted && !reduce ? { opacity: 0, y: 10 } : false;
  const index = Math.min(LIVE_STEP_COUNT - 1, Math.max(0, Math.round(step)));
  return (
    <div className={cn('relative', className)}>
      <BrowserFrame
        url={LIVE_URLS[index] ?? LIVE_URLS[0]}
        designWidth={1100}
        scale={0.55}
        className="w-full sm:w-[84%]"
      >
        <motion.div style={{ y: drift }}>
          <motion.div
            key={index}
            initial={enter}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            <BrowserPage step={index} />
          </motion.div>
        </motion.div>
      </BrowserFrame>
      <PhoneFrame
        designWidth={390}
        scale={0.55}
        className="absolute right-0 bottom-[-8%] hidden w-[22%] sm:block"
      >
        <motion.div
          key={index}
          initial={enter}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.08 }}
        >
          <PhonePage step={index} />
        </motion.div>
      </PhoneFrame>
    </div>
  );
}

export interface LoopLiveProps {
  /** Scroll progress through the loop, 0 to 1: the scene's scrollYProgress, or a plain number. */
  progress: MotionValue<number> | number;
  className?: string;
}

/**
 * The loop's live product layer (round 4 spec §3): real components with static props only, switching
 * per step as `progress` crosses each fifth, with a small in-step scroll. Decorative: inert, hidden from
 * assistive tech and click-through; the story cards carry the words. Re-renders only when the step changes.
 */
export function LoopLive({ progress, className }: LoopLiveProps) {
  const own = useMotionValue(typeof progress === 'number' ? progress : 0);
  const source = typeof progress === 'number' ? own : progress;
  const [step, setStep] = useState(() => liveStepAt(source.get()));
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        observer.disconnect();
        void loadLater();
      },
      { rootMargin: '100% 0px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (typeof progress === 'number') own.set(progress);
  }, [progress, own]);

  useMotionValueEvent(source, 'change', (value) => {
    const next = liveStepAt(value);
    setStep((current) => (current === next ? current : next));
  });

  const drift = useTransform(source, (value) => {
    const at = liveStepAt(value);
    return -DRIFT * segment(value, at / LIVE_STEP_COUNT, (at + 1) / LIVE_STEP_COUNT);
  });

  return (
    <div
      ref={ref}
      inert
      aria-hidden="true"
      className={cn('pointer-events-none select-none', className)}
    >
      <LoopLiveStep step={step} drift={drift} />
    </div>
  );
}
