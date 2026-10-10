import type { Overview } from '@fellow-owners/shared';
import { Activity } from 'lucide-react';
import { GlassPanel } from '@/components/shared/glass-panel';
import { Skeleton } from '@/components/ui/skeleton';
import { formatNumber, pluralize } from '@/lib/format';

export interface PulsePanelProps {
  /** pulseSentence() over this week's community activity; null when no community had new ideas. */
  sentence: string | null;
  stats: Overview['stats'] | undefined;
}

/** DESIGN.md Pulse: one sentence on how the week is going, and the two numbers behind Today. */
export function PulsePanel({ sentence, stats }: PulsePanelProps) {
  const ideas = stats?.ideasThisWeek.value ?? 0;
  const waiting = stats?.opportunitiesWaiting.value ?? 0;
  return (
    <GlassPanel as="section" aria-labelledby="pulse-title" className="p-5">
      <h2 id="pulse-title" className="flex items-center gap-2 text-small-strong text-ink-soft">
        <Activity aria-hidden className="size-4" strokeWidth={1.75} />
        This week
      </h2>
      <p className="mt-2 text-h2 text-ink">
        {sentence ?? 'A quiet week so far. New ideas from your fans will show up here.'}
      </p>
      {stats ? (
        <p className="mt-2 text-small text-ink-soft">
          {formatNumber(ideas)} new {pluralize(ideas, 'idea')} · {formatNumber(waiting)}{' '}
          {pluralize(waiting, 'fan message')} waiting for you
        </p>
      ) : null}
    </GlassPanel>
  );
}

export function PulsePanelSkeleton() {
  return (
    <div aria-hidden="true" className="glass flex flex-col gap-3 p-5">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-6 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}
