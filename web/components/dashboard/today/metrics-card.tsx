'use client';

import type { StatValue } from '@fellow-owners/shared';
import { useState } from 'react';
import { GlassPanel } from '@/components/shared/glass-panel';
import { Skeleton } from '@/components/ui/skeleton';
import { useMetrics } from '@/hooks/queries/use-metrics';
import { formatNumber } from '@/lib/format';

const WINDOWS = [7, 30] as const;
const percent = (n: number) => `${Math.round(n * 100)}%`;

function change(stat: StatValue): string | null {
  if (stat.changePct === null) return null;
  return `${stat.changePct > 0 ? '+' : ''}${stat.changePct}% vs the period before`;
}

function Tile({ label, value, note }: { label: string; value: string; note?: string | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-small text-ink-soft">{label}</dt>
      <dd className="text-h2 text-ink">{value}</dd>
      {note ? <dd className="text-small text-ink-soft">{note}</dd> : null}
    </div>
  );
}

/** Pilot analytics on Today: bio visitors, joins, how often you agree with the AI, collabs. */
export function MetricsCard() {
  const [days, setDays] = useState<(typeof WINDOWS)[number]>(30);
  const { data, isPending, isError } = useMetrics(days);
  if (isError) return null;

  return (
    <GlassPanel as="section" aria-labelledby="metrics-card-title" className="p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 id="metrics-card-title" className="text-label text-ink">
          How it's going
        </h2>
        <div className="flex gap-1.5">
          {WINDOWS.map((window) => (
            <button
              key={window}
              type="button"
              aria-pressed={days === window}
              onClick={() => setDays(window)}
              className="glass-chip h-8 rounded-full px-3 text-small text-ink aria-pressed:bg-white/90 aria-pressed:text-small-strong"
            >
              {window} days
            </button>
          ))}
        </div>
      </div>
      {isPending || !data ? (
        <div aria-hidden="true" className="mt-4 grid grid-cols-2 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <dl className="mt-4 grid grid-cols-2 gap-4">
          <Tile
            label="Bio page visitors"
            value={formatNumber(data.bioVisitors.value)}
            note={change(data.bioVisitors)}
          />
          <Tile label="New fans" value={formatNumber(data.joins.value)} note={change(data.joins)} />
          <Tile
            label="Visitors who joined"
            value={data.joinRate === null ? 'Not enough visits yet' : percent(data.joinRate)}
          />
          <Tile
            label="You agree with the AI"
            value={
              data.aiAgreement.rate === null ? 'No thumbs yet' : percent(data.aiAgreement.rate)
            }
            note={
              data.aiAgreement.rate === null
                ? null
                : `${data.aiAgreement.up} up, ${data.aiAgreement.down} down`
            }
          />
          <Tile label="Collabs under way" value={formatNumber(data.collabs)} />
          <Tile label="Promotions a week" value={String(data.promotionsPerWeek)} />
        </dl>
      )}
    </GlassPanel>
  );
}
