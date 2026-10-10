'use client';

import type { PersonRow } from '@fellow-owners/shared';
import { DecisionCard } from '@/components/dashboard/today/decision-card';
import { FansToThank } from '@/components/dashboard/today/fans-to-thank';
import { PulsePanel } from '@/components/dashboard/today/pulse-panel';
import { NAV_GROUPS } from '@/components/layout/dashboard-nav';
import { Logo } from '@/components/shared/logo';
import { MatchLabel } from '@/components/shared/match-label';
import { cn } from '@/components/ui/cn';
import { NEXT_CARD, TODAY_PULSE } from './creators-data';
import { DEMO } from './demo-data';
import { BrowserFrame } from './device-frames';
import { LIVE_DECISION, LIVE_URLS } from './loop-live-data';

/*
 * One browser-framed shot of the real studio shell: the icon rail, Today with its decision card, and the
 * right-hand pulse and fans column. The components are the app's own, fed fixtures. Decoration only: the
 * caller wraps it in aria-hidden + inert, so nothing in here is reachable. The content is laid out at a
 * fixed design width and zoomed to the frame (BrowserFrame designWidth), so it looks the same at any width.
 * The `@container` queries read that design width: the side column joins from 900px.
 */

const noop = () => {};
const RAIL = NAV_GROUPS.flatMap((group) => group.items);

function person(name: string, posts: number, teams: number): PersonRow {
  return {
    membershipId: name,
    name,
    image: null,
    headline: null,
    skills: [],
    links: [],
    joinedAt: '2026-09-20T09:00:00.000Z',
    communities: [],
    contributions: { posts, comments: 0, signalsReceived: 0, teams },
    risingScore: 0,
  };
}

/** Demo fans for "Fans to thank" (invented numbers; the whole shot is labelled Demo by its section). */
const FANS_TO_THANK = [person('Sana Iqbal', 3, 1), person('Dev Rao', 2, 0)];

function Rail() {
  return (
    <div className="glass-strong flex w-[72px] shrink-0 flex-col items-center gap-2 rounded-[28px] px-3.5 py-4">
      <Logo withWordmark={false} className="mb-4 h-11 items-center" />
      {RAIL.map(({ href, label, icon: Icon }, index) => (
        <span
          key={href}
          className={cn(
            'grid size-11 shrink-0 place-items-center rounded-full',
            index === 0 ? 'bg-aurora-peach text-coral' : 'text-ink-soft',
            index === RAIL.length - 1 && 'mt-auto',
          )}
        >
          <Icon aria-hidden="true" strokeWidth={1.5} className="size-5" />
          <span className="sr-only">{label}</span>
        </span>
      ))}
    </div>
  );
}

function Studio() {
  return (
    <div className="@container flex min-h-[650px] gap-4 bg-cream p-4 @max-[700px]:min-h-[750px]">
      <Rail />
      <div className="flex min-w-0 flex-1 flex-col gap-5 pt-2 pr-1">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-display text-[2.25rem] leading-none text-ink">
              Good morning, {DEMO.creator.firstName}
            </p>
            <p className="mt-2 text-body text-ink-soft">5 things need you · about 6 min</p>
          </div>
          <span className="glass-chip inline-flex h-8 items-center px-3 text-caption text-ink">
            Demo
          </span>
        </div>
        <div className="grid grid-cols-1 items-start gap-5 @[900px]:grid-cols-[minmax(0,1fr)_300px]">
          <div className="flex flex-col gap-4">
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
            <p className="glass flex items-center gap-3 rounded-[22px] px-5 py-3.5 text-small text-ink-soft">
              <span className="text-small-strong text-ink">Up next</span>
              <span className="min-w-0 flex-1 truncate">
                {NEXT_CARD.name} · {NEXT_CARD.context}
              </span>
              <MatchLabel score={NEXT_CARD.score} />
            </p>
          </div>
          <div className="flex flex-col gap-4">
            <PulsePanel sentence={TODAY_PULSE} stats={undefined} />
            <div className="hidden @[900px]:block">
              <FansToThank fans={FANS_TO_THANK} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Wide screens lay the studio out 1040px wide; phones lay it out 600px wide in a taller frame. */
export function StudioShot() {
  const url = LIVE_URLS[4];
  return (
    <>
      <BrowserFrame url={url} designWidth={1040} className="hidden sm:flex">
        <Studio />
      </BrowserFrame>
      <BrowserFrame
        url={url}
        designWidth={600}
        className="sm:hidden"
        screenClassName="aspect-[4/5]"
      >
        <Studio />
      </BrowserFrame>
    </>
  );
}
