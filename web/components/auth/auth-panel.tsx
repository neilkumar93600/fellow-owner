'use client';

import { Check, Code2, Dumbbell, Link2, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { usePathname } from 'next/navigation';
import type * as React from 'react';
import {
  briefing,
  communities,
  creator,
  promoteDraft,
  showcase,
} from '@/components/landing/demo-data';

import styles from './auth.module.css';
import { cx } from './auth-classes';

type MomentId = 'briefing' | 'communities' | 'featured';

interface Scene {
  line: string;
  /** Front to back: the first moment leads and sits on top. */
  order: [MomentId, MomentId, MomentId];
}

const SCENES: Record<string, Scene> = {
  '/login': {
    line: 'Your fanbase, sorted before your coffee.',
    order: ['briefing', 'communities', 'featured'],
  },
  '/sign-up': {
    line: 'Fans find their people. You find what’s worth backing.',
    order: ['communities', 'briefing', 'featured'],
  },
  '/verify-otp': {
    line: 'Every pitch arrives sorted, with its reason.',
    order: ['briefing', 'featured', 'communities'],
  },
  '/forgot-password': {
    line: 'Back what your community builds, and see who clicks.',
    order: ['featured', 'briefing', 'communities'],
  },
};
SCENES['/reset-password'] = SCENES['/forgot-password'] as Scene;

/**
 * Each slot's place in the layered stack: alternate edges, a small overlap, front slot on top. The back
 * slot only shows where there is room for three moments (1280px wide and 820px tall or more).
 */
const SLOT_CLASS = [
  'z-30 self-start',
  'z-20 -mt-3 self-end',
  'z-10 -mt-3 ml-[7%] self-start max-xl:hidden [@media(max-height:819px)]:hidden',
];

const EASE_OUT_QUART = [0.25, 1, 0.5, 1] as const;

/**
 * The grey shell beside every auth form: one calm line and three real product moments from the demo
 * space (Mira's AI briefing, Join suggestions, a featured project), layered and gently floating.
 * The cards are illustration, so they are hidden from assistive tech behind a one-line summary.
 */
export function AuthPanel() {
  const pathname = usePathname();
  const scene = SCENES[pathname] ?? (SCENES['/login'] as Scene);

  return (
    // Absolutely placed, so the panel never makes the page taller than the form column needs.
    <div className="absolute inset-0 flex justify-center p-10 xl:p-14">
      <div className="flex h-full w-full max-w-[640px] flex-col">
        <p className="glass-pill inline-flex h-9 items-center gap-2 self-start pr-4 pl-1.5 text-small text-ink">
          <span className="grid size-6 place-items-center rounded-full bg-lavender-tile text-[11px] font-semibold text-ink">
            MK
          </span>
          Demo: {creator.name}’s space
        </p>

        <p
          key={scene.line}
          className={cx(
            styles.fade,
            'mt-6 max-w-[19ch] text-h1 tracking-[-0.01em] text-balance text-ink xl:text-display',
          )}
        >
          {scene.line}
        </p>
        <p className="sr-only">
          Preview: an AI briefing that ranks a fan’s project, communities suggested from a fan’s
          intro, and a project Mira featured with its short link and clicks.
        </p>

        <div aria-hidden className="my-auto flex flex-col pt-8">
          {scene.order.map((id, slot) => (
            <motion.div
              key={id}
              layout="position"
              transition={{ layout: { duration: 0.25, ease: EASE_OUT_QUART } }}
              className={cx('relative w-full', SLOT_CLASS[slot])}
              style={{ maxWidth: MOMENT_WIDTH[id] }}
            >
              <div className={styles.float} data-slot={slot}>
                {MOMENTS[id]}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

const MOMENT_WIDTH: Record<MomentId, number> = {
  briefing: 496,
  communities: 440,
  featured: 360,
};

function AiChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex h-6 shrink-0 items-center gap-1 rounded-full bg-lime pr-2.5 pl-2 text-caption whitespace-nowrap text-ink">
      <Sparkles size={14} strokeWidth={1.5} />
      {children}
    </span>
  );
}

/** Fit pill (04 §5): tabular number plus a 24 by 4 bar, high band in success-ink. */
function FitPill({ fit }: { fit: number }) {
  const tone = fit >= 70 ? 'text-success-ink' : fit >= 40 ? 'text-warn-ink' : 'text-ink-muted';
  return (
    <span
      className={cx(
        'inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full border border-line bg-card-strong px-2 text-caption tabular',
        tone,
      )}
    >
      {fit}
      <span className={styles.fitBar}>
        <span style={{ transform: `scaleX(${fit / 100})` }} />
      </span>
    </span>
  );
}

function BriefingMoment() {
  const [top, second] = briefing.highlights;
  return (
    <div className="rounded-3xl bg-card p-6">
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-h2 text-ink">Your AI briefing</p>
        <p className="text-small text-ink-muted tabular">Today, 8:02</p>
      </div>
      <p className="mt-1 text-small text-ink-muted">Three things are worth your time today.</p>
      <ul className="mt-4 border-t border-line-row">
        {[top, second].map((item, index) =>
          item ? (
            <li
              key={item.title}
              className={cx(
                'flex items-start gap-3 pt-3.5',
                // The second pick only shows when the screen is tall enough for it.
                index > 0 && 'mt-3.5 border-t border-line-row [@media(max-height:959px)]:hidden',
              )}
            >
              <AiChip>AI pick</AiChip>
              <div className="min-w-0 flex-1">
                <p className="text-body font-medium text-ink">{item.title}</p>
                <p className="mt-0.5 text-small text-ink-muted">{item.why}</p>
              </div>
              {item.fit !== null ? <FitPill fit={item.fit} /> : null}
            </li>
          ) : null,
        )}
      </ul>
    </div>
  );
}

const SUGGESTED = [
  { slug: 'builders', icon: Code2, reason: 'Matches “frontend dev” in your intro' },
  { slug: 'fitness', icon: Dumbbell, reason: 'Matches “lifts” in your intro' },
] as const;

const TILE_TINT = {
  builders: { card: 'bg-aqua', tile: 'bg-aqua-tile text-teal' },
  fitness: { card: 'bg-peach', tile: 'bg-peach-tile text-orange' },
} as const;

function CommunitiesMoment() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {SUGGESTED.map(({ slug, icon: Icon, reason }) => {
        const community = communities.find((c) => c.slug === slug);
        if (!community) return null;
        const tint = TILE_TINT[slug];
        return (
          <div
            key={slug}
            className={cx(
              'relative rounded-3xl p-4 shadow-[inset_0_0_0_2px_var(--ink)]',
              tint.card,
            )}
          >
            <span className="absolute top-3.5 right-3.5 grid size-6 place-items-center rounded-full bg-ink text-card-strong">
              <Check size={14} strokeWidth={2} />
            </span>
            <span className={cx('grid size-10 place-items-center rounded-md', tint.tile)}>
              <Icon size={20} strokeWidth={1.5} />
            </span>
            <p className="mt-3 text-body font-medium text-ink">{community.name}</p>
            <p className="text-small text-ink-soft tabular">
              {community.members.toLocaleString('en-US')} members
            </p>
            <div className="mt-3">
              <AiChip>AI suggested</AiChip>
            </div>
            <p className="mt-2 text-small text-ink-soft">{reason}</p>
          </div>
        );
      })}
    </div>
  );
}

function FeaturedMoment() {
  const project = showcase[0];
  return (
    <div className="rounded-3xl bg-card-strong p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-small font-medium text-ink">
          <span className="grid size-7 place-items-center rounded-full bg-lavender-tile text-caption text-ink">
            MK
          </span>
          Featured by {creator.firstName}
        </span>
        <span className="inline-flex h-6 items-center rounded-full bg-info-bg px-2.5 text-caption text-info-ink">
          Live
        </span>
      </div>
      <p className="mt-3 text-h2 text-ink">{project?.title}</p>
      <p className="mt-0.5 text-small text-ink-muted">
        Built by {project?.team} members of {project?.community}
      </p>
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-3.5">
        <span className="inline-flex items-center gap-1.5 text-small text-ink-soft tabular">
          <Link2 size={16} strokeWidth={1.5} />
          {promoteDraft.shortLink}
        </span>
        <span className="text-small text-ink-soft tabular">
          <span className="font-semibold text-ink">
            {promoteDraft.clicks.toLocaleString('en-US')}
          </span>{' '}
          clicks
        </span>
      </div>
    </div>
  );
}

const MOMENTS: Record<MomentId, React.ReactNode> = {
  briefing: <BriefingMoment />,
  communities: <CommunitiesMoment />,
  featured: <FeaturedMoment />,
};
