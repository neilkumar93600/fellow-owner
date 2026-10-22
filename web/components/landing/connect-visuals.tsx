'use client';

import { Bell, Heart, Sparkles, Star, Timer } from 'lucide-react';
import { animate, motion, useMotionValue, useTransform, type Variants } from 'motion/react';
import type * as React from 'react';
import { useEffect } from 'react';
import { CreatorImage } from '@/components/shared/creator-image';
import { MatchLabel } from '@/components/shared/match-label';
import { usePrefersReducedMotion } from '@/hooks/use-media-query';
import type { CreatorAsset } from '@/lib/creator-assets';
import { cn } from '@/lib/utils';
import styles from './connect.module.css';
import { EXAMPLE, type ExampleCrewMember } from './example-data';

/**
 * The six step pictures for "New ways to connect". Each is a tiny piece of the real UI that plays once
 * when `on` turns true (its card became the active one) and then rests. Transform and opacity only.
 * Decoration: the card's title and line carry the meaning, so every picture is aria-hidden.
 */

const EASE = [0.25, 1, 0.5, 1] as const;
const SPRING = { type: 'spring', stiffness: 420, damping: 26 } as const;

// Not played yet: a faint ghost of the picture, so an upcoming card never reads as an empty box.
const rise: Variants = {
  off: { opacity: 0.18, y: 12 },
  on: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};
const pop: Variants = {
  off: { opacity: 0.18, scale: 0.85 },
  on: { opacity: 1, scale: 1, transition: SPRING },
};
const group = (stagger: number, delay = 0): Variants => ({
  off: {},
  on: { transition: { staggerChildren: stagger, delayChildren: delay } },
});

/** The white product card every picture sits in; children inherit its off/on state. */
function Frame({
  on,
  className,
  stagger = 0.12,
  children,
}: {
  on: boolean;
  className?: string;
  stagger?: number;
  children: React.ReactNode;
}) {
  // Reduced motion: remount straight into the end state (initial={false}), so no variant delay or
  // per-element transition can hold anything back.
  const reduced = usePrefersReducedMotion();
  return (
    <motion.div
      key={reduced ? 'still' : 'moving'}
      className={cn(styles.visual, className)}
      aria-hidden="true"
      initial={reduced ? false : 'off'}
      animate={on || reduced ? 'on' : 'off'}
      variants={group(stagger, 0.1)}
    >
      {children}
    </motion.div>
  );
}

/** Counts a motion value from 0 to `to` (or jumps there under reduced motion), written without re-renders. */
function useTally(to: number, on: boolean, duration: number, delay: number) {
  const value = useMotionValue(0);
  const reduced = usePrefersReducedMotion();
  useEffect(() => {
    if (!on) return;
    if (reduced) {
      value.jump(to);
      return;
    }
    const controls = animate(value, to, { duration, delay, ease: 'linear' });
    return () => controls.stop();
  }, [on, reduced, to, duration, delay, value]);
  return value;
}

/** Types `text` out. The full text holds the size underneath, so the bubble never reflows. */
function Typed({ text, on, delay }: { text: string; on: boolean; delay: number }) {
  const count = useTally(text.length, on, text.length * 0.045, delay);
  const shown = useTransform(count, (value) => text.slice(0, Math.round(value)));
  return (
    <span className={styles.typed}>
      <span className={styles.typedGhost}>{text}</span>
      <motion.span className={styles.typedLive}>{shown}</motion.span>
    </span>
  );
}

function Count({ to, on, delay }: { to: number; on: boolean; delay: number }) {
  const value = useTally(to, on, 0.9, delay);
  const shown = useTransform(value, (v) => Math.round(v));
  return <motion.b className="tabular">{shown}</motion.b>;
}

function Face({ name, size = 'md' }: { name: CreatorAsset; size?: 'sm' | 'md' | 'lg' }) {
  const px = size === 'lg' ? '88px' : size === 'sm' ? '24px' : '40px';
  return (
    <span className={cn(styles.face, styles[`face_${size}`])}>
      <CreatorImage name={name} alt="" fill sizes={px} />
    </span>
  );
}

const [priya, ines, maya] = EXAMPLE.crew as [
  ExampleCrewMember,
  ExampleCrewMember,
  ExampleCrewMember,
  ExampleCrewMember,
];

/* 01 Reply in your voice: a fan's DM, then a draft types out. The creator still sends it. */
function VoiceVisual({ on }: { on: boolean }) {
  return (
    <Frame on={on} className={styles.chat} stagger={0.5}>
      <motion.p variants={rise} className={cn(styles.bubble, styles.bubbleIn)}>
        <Face name={ines.avatar} size="sm" />
        Walk Porto with me?
      </motion.p>
      <motion.div variants={rise} className={styles.draftRow}>
        <span className={cn(styles.chip, styles.chipDraft)}>
          <Sparkles size={13} strokeWidth={1.75} />
          Draft
        </span>
        <p className={cn(styles.bubble, styles.bubbleOut)}>
          <Typed text="Yes! Send me your dates." on={on} delay={0.9} />
        </p>
      </motion.div>
      <motion.span
        variants={{
          off: { opacity: 0, y: 8 },
          on: { opacity: 1, y: 0, transition: { ...SPRING, delay: 1.6 } },
        }}
        className={styles.sendBtn}
      >
        Send
      </motion.span>
    </Frame>
  );
}

/* 02 What fans want: repeated asks become bars that fill. */
const WANTS = [
  { name: 'Porto on $60 a day', asks: 64 },
  { name: 'Film-photo walk, Lisbon', asks: 41 },
  { name: 'Taipei night markets', asks: 27 },
] as const;

function WantVisual({ on }: { on: boolean }) {
  return (
    <Frame on={on} className={styles.wants} stagger={0.18}>
      {WANTS.map(({ name, asks }, index) => (
        <motion.div key={name} variants={rise} className={styles.want}>
          <p className={styles.wantRow}>
            <span>{name}</span>
            <span className={styles.asks}>
              <Count to={asks} on={on} delay={0.2 + index * 0.18} /> asks
            </span>
          </p>
          <span className={styles.bar}>
            <motion.span
              className={styles.barFill}
              style={{ originX: 0 }}
              variants={{
                off: { scaleX: 0 },
                on: { scaleX: asks / 72, transition: { duration: 0.9, ease: EASE } },
              }}
            />
          </span>
        </motion.div>
      ))}
    </Frame>
  );
}

/* 03 Challenges: a brief, fan entries pop in, then your AI twin's shortlist of three. */
const ENTRIES: { dish: string; city: string; price: string; face: CreatorAsset; tint: string }[] = [
  { dish: 'Tacos', city: 'Austin', price: '$9.75', face: 'fan-1', tint: 'peach' },
  { dish: 'Pho', city: 'Houston', price: '$9.50', face: 'fan-2', tint: 'sky' },
  { dish: 'Plate lunch', city: 'Honolulu', price: '$10', face: 'fan-3', tint: 'lilac' },
  { dish: 'Jollof', city: 'Atlanta', price: '$8', face: 'fan-4', tint: 'mint' },
  { dish: 'Noodles', city: 'Flushing', price: '$8.50', face: 'fan-5', tint: 'peach' },
  { dish: 'Tortas', city: 'CDMX', price: '$5', face: 'fan-6', tint: 'sky' },
];
/** Entry index and match score (shown as words only). */
const PICKS = [
  { entry: 4, score: 91 },
  { entry: 3, score: 86 },
  { entry: 5, score: 82 },
] as const;

function ChallengeVisual({ on }: { on: boolean }) {
  return (
    <Frame on={on} className={styles.challenge} stagger={0.35}>
      <motion.p variants={rise} className={styles.brief}>
        <span className={styles.briefTitle}>Best $10 meal in your city</span>
        <span className={styles.chip}>
          <Timer size={13} strokeWidth={1.75} />5 days
        </span>
      </motion.p>
      <motion.ul variants={group(0.07)} className={styles.entries}>
        {ENTRIES.map(({ dish, price, face, tint }, index) => {
          const rank = PICKS.findIndex((pick) => pick.entry === index);
          return (
            <motion.li
              key={dish}
              variants={pop}
              className={cn(styles.entry, styles[`tint_${tint}`])}
            >
              <Face name={face} size="sm" />
              <span className={styles.entryTitle}>{dish}</span>
              <b className="tabular">{price}</b>
              {rank >= 0 ? (
                <motion.span
                  className={styles.rank}
                  variants={{
                    off: { opacity: 0, scale: 0 },
                    on: {
                      opacity: 1,
                      scale: 1,
                      transition: { ...SPRING, delay: 1.1 + rank * 0.15 },
                    },
                  }}
                >
                  {rank + 1}
                </motion.span>
              ) : null}
            </motion.li>
          );
        })}
      </motion.ul>
      <motion.ol variants={group(0.15, 0.6)} className={styles.picks}>
        {PICKS.map(({ entry, score }, index) => (
          <motion.li key={entry} variants={rise} className={styles.pick}>
            <span className={styles.pickRank}>{index + 1}</span>
            <span className={styles.pickTitle}>
              {ENTRIES[entry]?.dish}
              <span className={styles.city}>, {ENTRIES[entry]?.city}</span>
            </span>
            <MatchLabel score={score} />
          </motion.li>
        ))}
      </motion.ol>
    </Frame>
  );
}

/* 04 A heart from you: a fan's post gets "Loved by Mira" with a heart pop. */
const BURST = [0, 60, 120, 180, 240, 300].map((deg) => {
  const rad = (deg * Math.PI) / 180;
  return { deg, x: Math.cos(rad) * 46, y: Math.sin(rad) * 46 };
});

function HeartVisual({ on }: { on: boolean }) {
  return (
    <Frame on={on} className={styles.post} stagger={0.3}>
      <motion.div variants={rise} className={styles.postHead}>
        <Face name={priya.avatar} />
        <span>
          <b>{priya.name}</b>
          <span className={styles.muted}>{EXAMPLE.idea.community}</span>
        </span>
      </motion.div>
      <motion.p variants={rise} className={styles.postTitle}>
        {EXAMPLE.idea.title}
      </motion.p>
      <motion.p variants={rise} className={styles.prices}>
        {EXAMPLE.idea.prices.map((price) => (
          <span key={price} className={styles.chip}>
            {price}
          </span>
        ))}
      </motion.p>
      <span className={styles.heartStage}>
        {BURST.map(({ deg, x, y }) => (
          <motion.i
            key={deg}
            className={styles.spark}
            variants={{
              off: { opacity: 0, x: 0, y: 0, scale: 0.4 },
              on: {
                opacity: [0, 1, 0],
                x: [0, x],
                y: [0, y],
                scale: [0.4, 1, 0.6],
                transition: { duration: 0.7, delay: 1.05, ease: EASE },
              },
            }}
          />
        ))}
        <motion.span
          className={styles.bigHeart}
          variants={{
            off: { opacity: 0, scale: 0 },
            on: {
              opacity: 1,
              scale: [0, 1.3, 1],
              transition: { duration: 0.6, delay: 0.95, ease: EASE },
            },
          }}
        >
          <Heart size={30} strokeWidth={2} fill="currentColor" />
        </motion.span>
      </span>
      <motion.span
        className={styles.loved}
        variants={{
          off: { opacity: 0, y: 10 },
          on: { opacity: 1, y: 0, transition: { ...SPRING, delay: 1.35 } },
        }}
      >
        <Heart size={14} strokeWidth={2} fill="currentColor" />
        Loved by {EXAMPLE.creator.firstName}
      </motion.span>
    </Frame>
  );
}

/* 05 Your idea made it: the crew slides in, then a "Featured" stamp lands. */
function FeaturedVisual({ on }: { on: boolean }) {
  return (
    <Frame on={on} className={styles.featured} stagger={0.3}>
      <motion.p variants={rise} className={styles.notice}>
        <span className={styles.noticeIcon}>
          <Bell size={14} strokeWidth={1.75} />
        </span>
        {EXAMPLE.idea.title}
      </motion.p>
      <motion.ul variants={group(0.1)} className={styles.crew}>
        {EXAMPLE.crew.map((member) => (
          <motion.li
            key={member.name}
            variants={{
              off: { opacity: 0, x: 28 },
              on: { opacity: 1, x: 0, transition: SPRING },
            }}
          >
            <Face name={member.avatar} />
            <b>{member.firstName}</b>
            <span className={styles.muted}>{member.role.split(' ')[0]}</span>
          </motion.li>
        ))}
      </motion.ul>
      <motion.span
        className={styles.stamp}
        variants={{
          off: { opacity: 0, scale: 1.8, rotate: -16 },
          on: {
            opacity: 1,
            scale: 1,
            rotate: -8,
            transition: { type: 'spring', stiffness: 520, damping: 18, delay: 0.9 },
          },
        }}
      >
        Featured
      </motion.span>
    </Frame>
  );
}

/* 06 Fan spotlight: fans of the week, a few stars sparkle and rest. */
const STARS = [
  { top: '-12px', left: '70px', size: 20, delay: 0.7 },
  { top: '46px', left: '-22px', size: 15, delay: 0.85 },
  { top: '70px', left: '82px', size: 12, delay: 1 },
] as const;

function SpotlightVisual({ on }: { on: boolean }) {
  return (
    <Frame on={on} className={styles.spotlight} stagger={0.25}>
      <motion.p variants={rise} className={styles.label}>
        <Star size={13} strokeWidth={1.75} /> Fans of the week
      </motion.p>
      <motion.div variants={pop} className={styles.hero}>
        <span className={styles.heroFace}>
          <Face name={maya.avatar} size="lg" />
          {STARS.map(({ top, left, size, delay }) => (
            <motion.span
              key={top}
              className={styles.star}
              style={{ top, left }}
              variants={{
                off: { opacity: 0, scale: 0, rotate: -40 },
                on: {
                  opacity: [0, 1, 0.75, 1],
                  scale: [0, 1.3, 0.9, 1],
                  rotate: 0,
                  transition: { duration: 0.9, delay, ease: EASE },
                },
              }}
            >
              <Star size={size} strokeWidth={1.5} fill="currentColor" />
            </motion.span>
          ))}
        </span>
        <span>
          <b>{maya.name}</b>
          <span className={styles.muted}>{maya.role}</span>
        </span>
      </motion.div>
      <motion.p variants={rise} className={styles.quote}>
        “Shot Lisbon at golden hour.”
      </motion.p>
      <motion.div variants={rise} className={styles.runners}>
        <Face name={priya.avatar} size="sm" />
        <Face name={ines.avatar} size="sm" />
        <Face name="fan-3" size="sm" />
        <span className={styles.muted}>+3 rising</span>
      </motion.div>
    </Frame>
  );
}

export const STEP_VISUALS = {
  voice: VoiceVisual,
  want: WantVisual,
  challenge: ChallengeVisual,
  heart: HeartVisual,
  featured: FeaturedVisual,
  spotlight: SpotlightVisual,
} as const;

export type StepVisualId = keyof typeof STEP_VISUALS;
