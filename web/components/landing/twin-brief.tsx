import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TWIN_BRIEF } from './hero-product-data';

export interface TwinBriefProps {
  /** Smaller type and two picks (the auth panel). */
  compact?: boolean;
}

/**
 * "Your AI twin": the twin's weekly read of every room, with its picks, each with a one-line why. Words
 * only, no controls, so callers can mark it inert. Demo data.
 */
export function TwinBrief({ compact = false }: TwinBriefProps) {
  const picks = compact ? TWIN_BRIEF.picks.slice(0, 2) : TWIN_BRIEF.picks;

  return (
    <div
      className={cn(
        'glass-strong flex flex-col text-ink',
        compact ? 'gap-3 rounded-2xl p-4' : 'gap-4 rounded-[28px] p-5',
      )}
    >
      <div className="flex items-center gap-2.5">
        <span
          aria-hidden="true"
          className="grid size-8 flex-none place-items-center rounded-full bg-periwinkle text-lake"
        >
          <Sparkles size={15} strokeWidth={1.75} />
        </span>
        <p className="min-w-0 text-caption uppercase">Your AI twin</p>
      </div>

      <p className={cn('text-pretty', compact ? 'text-small' : 'text-body')}>
        Read{' '}
        <strong className="font-medium tabular-nums">
          {TWIN_BRIEF.read.toLocaleString('en-US')}
        </strong>{' '}
        messages in {TWIN_BRIEF.rooms} rooms this week.{' '}
        <strong className="font-medium">{TWIN_BRIEF.needYou} need you.</strong>
      </p>

      <ol className={cn('flex flex-col', compact ? 'gap-2' : 'gap-2.5')}>
        {picks.map((pick) => (
          <li
            key={pick.id}
            className={cn(
              'flex flex-col gap-0.5 rounded-lg border border-line bg-white/70',
              compact ? 'px-3 py-2' : 'px-3.5 py-2.5',
            )}
          >
            <span className="text-caption text-ink-soft uppercase">
              {pick.kind} · {pick.from}
            </span>
            <span className={cn('font-medium', compact ? 'text-small' : 'text-body')}>
              {pick.title}
            </span>
            <span className="text-small text-ink-soft">{pick.why}</span>
          </li>
        ))}
      </ol>

      <p className="text-caption text-ink-muted">Demo data. Names are made up.</p>
    </div>
  );
}
