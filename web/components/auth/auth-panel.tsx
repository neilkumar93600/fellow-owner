'use client';

import { Check, Code2, Dumbbell, Link2, Sparkles } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
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

const EASE_OUT_QUART = [0.25, 1, 0.5, 1] as const;

/**
 * The grey shell beside every auth form: one calm line and real product moments from the demo space
 * (Mira's AI briefing, Join suggestions, a featured project), layered front to back. How many moments
 * show depends on the room the panel has (see auth.module.css). They rise in once on load and slide to
 * their new places between screens, never under reduced motion. The cards are illustration, so they
 * are hidden from assistive tech behind a one-line summary.
 */
export function AuthPanel() {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const scene = SCENES[pathname] ?? (SCENES['/login'] as Scene);

  return (
    <div className={styles.panel}>
      <div className={styles.panelInner}>
        <div>
          <p className="glass-pill inline-flex h-9 items-center gap-2 pr-4 pl-1.5 text-small whitespace-nowrap text-ink">
            <span className="grid size-6 place-items-center rounded-full bg-lavender-tile text-[11px] font-semibold text-ink">
              MK
            </span>
            Demo: {creator.name}’s space
          </p>
          <p
            key={scene.line}
            data-line
            className={cx(
              styles.fade,
              'mt-5 max-w-[24ch] text-h2 tracking-[-0.01em] text-balance text-ink lg:mt-6 lg:text-h1',
            )}
          >
            {scene.line}
          </p>
        </div>
        <p className="sr-only">
          Preview: an AI briefing that ranks a fan’s project, communities suggested from a fan’s
          intro, and a project Mira featured with its short link and clicks.
        </p>

        <div aria-hidden className={styles.moments}>
          <div className={styles.stack}>
            {scene.order.map((id, slot) => (
              <motion.div
                key={id}
                layout={reduceMotion ? false : 'position'}
                transition={{ layout: { duration: 0.25, ease: EASE_OUT_QUART } }}
                className={styles.slot}
                data-slot={slot}
                style={{ maxWidth: MOMENT_WIDTH[id] }}
              >
                <div
                  data-moment={id}
                  className={styles.rise}
                  style={{ animationDelay: `${slot * 60}ms` }}
                >
                  {MOMENTS[id]}
                </div>
              </motion.div>
            ))}
          </div>
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

/** demo-data writes quotes straight; the panel sets them curly like the rest of the copy. */
function curlyQuotes(text: string): string {
  return text.replace(/"([^"]*)"/g, '“$1”');
}

/**
 * One pick shows, or two when the panel is tall enough. The closing row counts what is left of the three,
 * so the card never looks cut short.
 */
function BriefingMoment() {
  const [top, second] = briefing.highlights;
  const total = briefing.highlights.length;
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
                index > 0 && cx(styles.pickExtra, 'mt-3.5 border-t border-line-row'),
              )}
            >
              <AiChip>AI pick</AiChip>
              <div className="min-w-0 flex-1">
                <p className="text-body font-medium text-ink">{item.title}</p>
                <p className="mt-0.5 text-small text-ink-muted">{curlyQuotes(item.why)}</p>
              </div>
              {item.fit !== null ? <FitPill fit={item.fit} /> : null}
            </li>
          ) : null,
        )}
      </ul>
      <p className="mt-3.5 border-t border-line-row pt-3 text-small text-ink-muted tabular">
        <span className={styles.moreTwo}>+{total - 1} more in today’s briefing</span>
        <span className={styles.moreOne}>+{total - 2} more in today’s briefing</span>
      </p>
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
