'use client';

import { Check, MousePointerClick, Sparkles } from 'lucide-react';
import {
  type MotionValue,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useTransform,
} from 'motion/react';
import { type ReactNode, useEffect, useState } from 'react';
import { CommunityGrid } from '@/components/bio/community-grid';
import { CreatorHeader } from '@/components/bio/creator-header';
import { DecisionCard } from '@/components/dashboard/today/decision-card';
import { AvatarInitials, AvatarStack } from '@/components/shared/avatar-initials';
import { CommunityChip } from '@/components/shared/community-chip';
import { IdeaCard } from '@/components/shared/idea-card';
import { SignalButtons } from '@/components/shared/signal-buttons';
import { StatCard } from '@/components/shared/stat-card';
import { cn } from '@/components/ui/cn';
import { segment } from '@/hooks/use-scroll-scene';
import { DEMO } from './demo-data';
import { BrowserFrame, PhoneFrame } from './device-frames';
import {
  LIVE_CREW,
  LIVE_DECISION,
  LIVE_FEED,
  LIVE_JOIN,
  LIVE_JOINED_ROOM,
  LIVE_ROOMS,
  LIVE_SPACE,
  LIVE_STAT,
  LIVE_URLS,
} from './loop-live-data';

/** Five steps: followers, communities, idea, crew, featured (the order of storySteps). */
export const LIVE_STEP_COUNT = LIVE_URLS.length;

/** Step `i` owns progress [i / 5, (i + 1) / 5]; 1 stays on the last step. */
export function liveStepAt(progress: number): number {
  return Math.min(LIVE_STEP_COUNT - 1, Math.max(0, Math.floor(progress * LIVE_STEP_COUNT)));
}

/** How far the browser page scrolls inside one step, in layout px: the page reads as being used. */
const DRIFT = 72;
const noop = () => {};
const BIO = 'mx-auto flex max-w-[792px] flex-col gap-8 p-8 @container';

function BrowserPage({ step }: { step: number }) {
  switch (step) {
    case 0:
      return (
        <div className={BIO}>
          <CreatorHeader space={LIVE_SPACE} cta={{ href: '#', label: 'Join a room' }} />
          <CommunityGrid handle={LIVE_SPACE.handle} communities={LIVE_ROOMS} joinedIds={[]} />
        </div>
      );
    case 1:
      return (
        <div className={BIO}>
          <p className="glass-chip inline-flex h-10 items-center gap-2 self-start px-4 text-label text-ink">
            <Check aria-hidden="true" strokeWidth={2} className="size-4 text-success" />
            Joined {LIVE_JOINED_ROOM.name}
          </p>
          <CommunityGrid
            handle={LIVE_SPACE.handle}
            communities={LIVE_ROOMS}
            joinedIds={[LIVE_JOINED_ROOM.id]}
          />
        </div>
      );
    case 2:
      return (
        <div className="mx-auto flex max-w-[792px] flex-col gap-5 p-8">
          <div className="flex items-center justify-between gap-4">
            <p className="font-display text-[2.5rem] leading-none text-ink">
              {LIVE_JOINED_ROOM.name}
            </p>
            <CommunityChip
              name={`${LIVE_JOINED_ROOM.memberCount.toLocaleString('en-US')} fans`}
              tint={LIVE_JOINED_ROOM.tint}
              icon={LIVE_JOINED_ROOM.icon}
            />
          </div>
          {LIVE_FEED.map((post) => (
            <IdeaCard key={post.id} post={post} href="#" variant="fan" />
          ))}
        </div>
      );
    case 3:
      return (
        <div className="mx-auto flex max-w-[792px] flex-col gap-5 p-8">
          <div className="glass-strong flex flex-col gap-5 p-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CommunityChip
                name={LIVE_JOINED_ROOM.name}
                tint={LIVE_JOINED_ROOM.tint}
                icon={LIVE_JOINED_ROOM.icon}
              />
              <AvatarStack people={LIVE_CREW} />
            </div>
            <p className="font-display text-[2.5rem] leading-[1.05] text-ink">{DEMO.idea.title}</p>
            <p className="text-small-strong text-ink-soft">
              Crew · {LIVE_CREW.length} of {LIVE_CREW.length} roles filled
            </p>
            <ul className="flex flex-col gap-2">
              {LIVE_CREW.map((member) => (
                <li
                  key={member.role}
                  className="flex items-center gap-3 rounded-2xl bg-white/70 py-2.5 pr-4 pl-2.5"
                >
                  <AvatarInitials name={member.name} image={member.image} size={40} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-label text-ink">{member.name}</span>
                    <span className="block text-small text-ink-soft">{member.role}</span>
                  </span>
                  <span className="inline-flex items-center gap-1 text-small text-success-ink">
                    <Check aria-hidden="true" strokeWidth={2} className="size-4" />
                    Filled
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      );
    default:
      return (
        <div className="mx-auto flex max-w-[1040px] flex-col gap-6 p-8">
          <div>
            <p className="font-display text-[2.5rem] leading-none text-ink">
              Good morning, {DEMO.creator.firstName}
            </p>
            <p className="mt-2 text-body text-ink-soft">5 things need you</p>
          </div>
          <div className="grid grid-cols-[1fr_300px] items-start gap-6">
            <DecisionCard
              item={LIVE_DECISION}
              featureHref="#"
              loved={false}
              canLove
              onFeature={noop}
              onReply={noop}
              onLove={noop}
              onLater={noop}
            />
            <StatCard
              tint="peach"
              icon={MousePointerClick}
              value={LIVE_STAT.value}
              label={LIVE_STAT.label}
              changePct={null}
              descriptor={LIVE_STAT.descriptor}
              href="#"
            />
          </div>
        </div>
      );
  }
}

/** A plain phone card: the fan's side of the same step. */
function PhoneCard({
  kicker,
  title,
  children,
}: {
  kicker: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="glass-strong flex flex-col gap-3 p-5">
      <p className="text-caption text-ink-soft">{kicker}</p>
      <p className="font-display text-[1.75rem] leading-[1.1] text-ink">{title}</p>
      {children}
    </div>
  );
}

function PhonePage({ step }: { step: number }) {
  switch (step) {
    case 0:
      return <CreatorHeader space={LIVE_SPACE} cta={{ href: '#', label: 'Join a room' }} />;
    case 1:
      return (
        <div className="flex flex-col gap-4 px-4 pt-14">
          <PhoneCard kicker="Join" title="Rooms picked for you">
            <p className="text-small text-ink-soft">“{LIVE_JOIN.intro}”</p>
            <ul className="flex flex-col gap-2">
              {LIVE_JOIN.picks.map((pick) => (
                <li key={pick.room.id} className="flex flex-col gap-1 rounded-2xl bg-white/70 p-3">
                  <span className="flex items-center justify-between gap-2">
                    <CommunityChip
                      name={pick.room.name}
                      tint={pick.room.tint}
                      icon={pick.room.icon}
                    />
                    <Check aria-hidden="true" strokeWidth={2} className="size-4 text-success" />
                  </span>
                  <span className="text-small text-ink-soft">
                    <Sparkles
                      aria-hidden="true"
                      strokeWidth={1.5}
                      className="mr-1 inline size-3.5"
                    />
                    {pick.why}
                  </span>
                </li>
              ))}
            </ul>
          </PhoneCard>
        </div>
      );
    case 2:
      return (
        <div className="flex flex-col gap-4 px-4 pt-14">
          <PhoneCard
            kicker={`${DEMO.idea.author} in ${DEMO.idea.community}`}
            title={DEMO.idea.title}
          >
            <p className="text-small text-ink-soft">{DEMO.idea.excerpt}</p>
            <SignalButtons
              useCount={DEMO.idea.use}
              buildCount={DEMO.idea.build}
              viewerSignals={['use']}
            />
          </PhoneCard>
        </div>
      );
    case 3:
      return (
        <div className="flex flex-col gap-4 px-4 pt-14">
          <PhoneCard kicker="Your crew" title="You’re in as Photographer">
            <AvatarStack people={LIVE_CREW} />
            <p className="text-small text-ink-soft">
              {LIVE_CREW.map((member) => member.firstName).join(', ')}
            </p>
          </PhoneCard>
        </div>
      );
    default:
      return (
        <div className="flex flex-col gap-4 px-4 pt-14">
          <PhoneCard kicker={`Featured by ${DEMO.creator.firstName}`} title={DEMO.idea.title}>
            <p className="text-small-strong text-ink">Made by</p>
            <ul className="flex flex-col gap-1.5">
              {LIVE_CREW.map((member) => (
                <li key={member.role} className="flex items-center gap-2 text-small text-ink">
                  <AvatarInitials name={member.name} image={member.image} size={28} />
                  {member.firstName}
                  <span className="text-ink-soft">· {member.role}</span>
                </li>
              ))}
            </ul>
          </PhoneCard>
        </div>
      );
  }
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
  const enter = reduce ? false : { opacity: 0, y: 10 };
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
    <div inert aria-hidden="true" className={cn('pointer-events-none select-none', className)}>
      <LoopLiveStep step={step} drift={drift} />
    </div>
  );
}
