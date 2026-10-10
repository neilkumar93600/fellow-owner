'use client';

import {
  ANALYTICS_WINDOWS,
  type AnalyticsWindow,
  COMMUNITY_ACTIVITY_FORMULA,
  type CommunityActivity,
} from '@fellow-owners/shared';
import { Activity, Info } from 'lucide-react';
import { useState } from 'react';
import { ChartCard } from '@/components/shared/chart-card';
import { EmptyState } from '@/components/shared/empty-state';
import { SegmentedPill } from '@/components/shared/segmented-pill';
import { Trend } from '@/components/shared/trend';
import { cn } from '@/components/ui/cn';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip } from '@/components/ui/tooltip';
import { useCommunityActivity } from '@/hooks/queries/use-insights';
import { formatNumber, pluralize } from '@/lib/format';
import { QueryError } from './query-error';

const WINDOW_OPTIONS = ANALYTICS_WINDOWS.map((days) => ({
  value: String(days),
  label: `${days} days`,
}));

function useWindow() {
  const [days, setDays] = useState<AnalyticsWindow>(7);
  const control = (
    <SegmentedPill
      label="Activity period"
      options={WINDOW_OPTIONS}
      value={String(days)}
      onChange={(value) => setDays(Number(value) as AnalyticsWindow)}
    />
  );
  return { days, control };
}

/** The score formula, on hover and keyboard focus; the shared UI copy. */
function FormulaTip() {
  return (
    <Tooltip content={COMMUNITY_ACTIVITY_FORMULA} side="bottom">
      <button
        type="button"
        aria-label="How the activity score works"
        className="press grid size-8 place-items-center rounded-full text-ink-soft hover:bg-white"
      >
        <Info aria-hidden="true" strokeWidth={1.5} className="size-4" />
      </button>
    </Tooltip>
  );
}

function Chips({ community: c }: { community: CommunityActivity }) {
  const counts = [
    { label: 'post', n: c.posts },
    { label: 'comment', n: c.comments },
    { label: 'signal', n: c.signals },
    { label: 'new fan', n: c.newMembers },
    { label: 'tagged follower', n: c.followers },
  ];
  return (
    <ul className="flex flex-wrap gap-2">
      {counts.map(({ label, n }) => (
        <li key={label} className="rounded-full bg-white px-3 py-1 text-small text-ink-soft">
          {formatNumber(n)} {pluralize(n, label)}
        </li>
      ))}
    </ul>
  );
}

/** One line on who leads; nothing to rank when the period was quiet. */
function summarize(list: CommunityActivity[], days: number): string {
  const top = list[0];
  if (!top || top.score === 0) return `No activity in the last ${days} days.`;
  const vs =
    top.change === null
      ? 'with nothing to compare against before'
      : `${top.change >= 0 ? 'up' : 'down'} ${Math.abs(top.change)}% on the previous ${days} days`;
  return `${top.name} leads with ${formatNumber(top.score)} points, ${vs}.`;
}

function ActivitySkeleton() {
  return (
    <div aria-busy="true" className="glass rounded-panel p-6">
      <span className="sr-only" role="status">
        Loading activity
      </span>
      <Skeleton className="h-7 w-48" />
      <div className="mt-6 flex flex-col gap-5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-col gap-2">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-3 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** The Communities screen's "Most active" ranking: score bars, count chips, change vs the period before. */
export function CommunityActivityCard() {
  const { days, control } = useWindow();
  const { data, isPending, isError, error, refetch, isPlaceholderData } =
    useCommunityActivity(days);

  if (isPending) return <ActivitySkeleton />;
  if (isError) return <QueryError error={error} onRetry={() => void refetch()} />;

  const list = data.communities;
  const max = Math.max(1, ...list.map((c) => c.score));

  return (
    <ChartCard
      title="Most active"
      action={
        <span className="flex items-center gap-2">
          <FormulaTip />
          {control}
        </span>
      }
      summary={summarize(list, days)}
      data={{
        columns: [
          'Community',
          'Score',
          'Change',
          'Posts',
          'Comments',
          'Signals',
          'New fans',
          'Followers',
        ],
        rows: list.map((c) => [
          c.name,
          c.score,
          c.change === null ? 'n/a' : `${c.change}%`,
          c.posts,
          c.comments,
          c.signals,
          c.newMembers,
          c.followers,
        ]),
      }}
    >
      {list.length ? (
        <ol
          aria-busy={isPlaceholderData}
          className={cn('flex flex-col gap-6', isPlaceholderData && 'opacity-60')}
        >
          {list.map((c, i) => (
            <li key={c.id} className="flex flex-col gap-2">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <span className="text-label text-ink">
                  {i + 1}. {c.name}
                </span>
                <span className="flex items-center gap-3">
                  <Trend changePct={c.change} size="small" />
                  <span className="text-small-strong text-ink">
                    {formatNumber(c.score)} {pluralize(c.score, 'point')}
                  </span>
                </span>
              </div>
              <div aria-hidden="true" className="h-3 overflow-hidden rounded-full bg-white/70">
                <div
                  className="h-full rounded-full bg-chart-2"
                  style={{ width: `${(c.score / max) * 100}%` }}
                />
              </div>
              <Chips community={c} />
            </li>
          ))}
        </ol>
      ) : (
        <EmptyState icon={Activity} body="Add a community to see how active it is." />
      )}
    </ChartCard>
  );
}

/** One community's numbers for the chosen period, on its detail page. */
export function CommunityActivityPanel({ slug }: { slug: string }) {
  const { days, control } = useWindow();
  const { data, isPending, isError } = useCommunityActivity(days);
  const rank = data?.communities.findIndex((c) => c.slug === slug) ?? -1;
  const community = rank >= 0 ? data?.communities[rank] : undefined;

  // Secondary to the page: a failed read or an archived community leaves the section out.
  if (isError || (!isPending && !community)) return null;

  return (
    <section
      aria-labelledby="community-activity-title"
      className="flex flex-col gap-4 glass rounded-panel p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="community-activity-title" className="text-h2 text-ink">
          Activity
        </h2>
        <span className="flex items-center gap-2">
          <FormulaTip />
          {control}
        </span>
      </div>
      {community ? (
        <div aria-live="polite" className="flex flex-col gap-3">
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-body text-ink-soft">
            <span className="text-trend text-ink">
              {formatNumber(community.score)} {pluralize(community.score, 'point')}
            </span>
            <span>
              #{rank + 1} of {data?.communities.length}
            </span>
            <Trend
              changePct={community.change}
              size="small"
              descriptor={`vs previous ${days} days`}
            />
          </p>
          <Chips community={community} />
        </div>
      ) : (
        <Skeleton className="h-16 rounded-md" />
      )}
    </section>
  );
}
