import type { CommunityActivity } from '@fellow-owners/shared';
import Link from 'next/link';
import type * as React from 'react';
import { COMMUNITY_ICON, cardTint, TINT_STYLES } from '@/components/shared/tint';
import { cn } from '@/components/ui/cn';
import { Skeleton } from '@/components/ui/skeleton';
import { formatNumber, pluralize } from '@/lib/format';
import { routes } from '@/lib/routes';
import { estimateMinutes } from './decision-items';
import { DecisionStackSkeleton } from './decision-stack';
import { FansToThankSkeleton } from './fans-to-thank';
import { PulsePanelSkeleton } from './pulse-panel';

interface TodaySlots {
  banner?: React.ReactNode;
  /** The serif greeting line, with the count of cards below it; null while the stack loads. */
  greeting: React.ReactNode;
  stack: React.ReactNode;
  pulse: React.ReactNode;
  fans: React.ReactNode;
  communities: React.ReactNode;
}

/**
 * DESIGN.md Today. The greeting, then the decision stack beside a right column (pulse, fans to thank,
 * community tiles) once main is 56rem wide; below that the column drops under the stack. Shared by the
 * screen and its skeleton so both hold one shape.
 */
export function TodayView({ banner, greeting, stack, pulse, fans, communities }: TodaySlots) {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="sr-only">Today</h1>
      {banner}
      {greeting}
      <div className="grid items-start gap-6 @4xl:grid-cols-[minmax(0,1fr)_minmax(300px,360px)]">
        <div className="min-w-0">{stack}</div>
        <div className="flex min-w-0 flex-col gap-4">
          {pulse}
          {fans}
          {communities}
        </div>
      </div>
    </div>
  );
}

function partOfDay(hour: number): string {
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

/** "Good morning, Mira" and "5 things need you · about 6 min". The page's h1 is the sr-only "Today" above. */
export function TodayGreeting({ firstName, count }: { firstName: string; count: number | null }) {
  return (
    <div>
      {/* The hour is the viewer's; the server's guess may differ. */}
      <p
        suppressHydrationWarning
        className="font-display text-[34px] leading-[1.05] text-ink sm:text-[40px] md:text-[52px]"
      >
        Good {partOfDay(new Date().getHours())}, {firstName}
      </p>
      {count === null ? (
        <Skeleton className="mt-3 h-5 w-56" />
      ) : (
        <p className="mt-2 text-body text-ink-soft">
          {count === 0
            ? 'Nothing needs you right now.'
            : `${formatNumber(count)} ${pluralize(count, 'thing needs', 'things need')} you · about ${estimateMinutes(count)} min`}
        </p>
      )}
    </div>
  );
}

/** DESIGN.md Community tiles: the four busiest rooms this week, each a tinted frosted tile. */
export function CommunityTiles({ communities }: { communities: CommunityActivity[] }) {
  const top = [...communities].sort((a, b) => b.posts - a.posts).slice(0, 4);
  if (top.length === 0) return null;
  return (
    <section aria-labelledby="today-communities-title">
      <div className="mb-2 flex items-baseline justify-between gap-3 px-1">
        <h2 id="today-communities-title" className="text-label text-ink">
          Your communities
        </h2>
        <Link href={routes.dashboard.communities()} className="text-small text-sky hover:underline">
          All communities
        </Link>
      </div>
      <ul className="grid grid-cols-2 gap-3">
        {top.map((c) => {
          const style = TINT_STYLES[cardTint(c.tint)];
          const Icon = COMMUNITY_ICON[c.icon] ?? COMMUNITY_ICON.users;
          return (
            <li key={c.id}>
              <Link
                href={routes.dashboard.community(c.slug)}
                className={cn(
                  'press flex h-full flex-col gap-2 rounded-[22px] p-4 shadow-glass',
                  style.card,
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn('grid size-9 place-items-center rounded-full', style.tile)}
                >
                  <Icon className={cn('size-[18px]', style.icon)} strokeWidth={1.75} />
                </span>
                <span className="text-label leading-tight text-ink">{c.name}</span>
                <span className="text-small text-ink-soft">
                  {formatNumber(c.posts)} new {pluralize(c.posts, 'idea')}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function CommunityTilesSkeleton() {
  return (
    <div aria-hidden="true" className="grid grid-cols-2 gap-3">
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-[124px] rounded-[22px]" />
      ))}
    </div>
  );
}

/** Today while it loads: the same layout, each part replaced by its skeleton (The Same Shape Rule). */
export function TodaySkeleton() {
  return (
    <div aria-busy="true">
      <span className="sr-only" role="status">
        Loading
      </span>
      <TodayView
        greeting={
          <div>
            <Skeleton className="h-12 w-80 max-w-full rounded-2xl" />
            <Skeleton className="mt-3 h-5 w-56" />
          </div>
        }
        stack={<DecisionStackSkeleton />}
        pulse={<PulsePanelSkeleton />}
        fans={<FansToThankSkeleton />}
        communities={<CommunityTilesSkeleton />}
      />
    </div>
  );
}
