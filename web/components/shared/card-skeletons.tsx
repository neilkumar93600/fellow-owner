import { cn } from '@/components/ui/cn';
import { Skeleton } from '@/components/ui/skeleton';
import { type CardTint, TINT_STYLES } from './tint';

// DESIGN.md Skeleton and The Same Shape Rule: each one holds the exact footprint of its card, Dove Grey
// blocks on the card's own surface, so nothing jumps when the data arrives. Mark the loading region
// aria-busy; the blocks are hidden from screen readers.

export function StatCardSkeleton({
  tint = 'white',
  className,
}: {
  tint?: CardTint;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'grid min-w-0 grid-cols-[56px_1fr] items-center gap-x-4 gap-y-0.5 rounded-card p-6',
        TINT_STYLES[tint].card,
        className,
      )}
    >
      <Skeleton className="row-span-2 size-14 rounded-md" />
      <div className="flex h-11 items-end pb-1">
        <Skeleton className="h-8 w-28 rounded-lg" />
      </div>
      <div className="flex h-[18px] items-center">
        <Skeleton className="h-3 w-24" />
      </div>
      <div className="col-span-full mt-4 flex h-6 items-center">
        <Skeleton className="h-4 w-40" />
      </div>
    </div>
  );
}

/** `height` is the chart's: 280 for the line chart, DONUT_HEIGHT for the donut. */
export function ChartCardSkeleton({
  height = 280,
  className,
}: {
  height?: number;
  className?: string;
}) {
  return (
    <div className={cn('glass min-w-0 p-6', className)}>
      <div className="flex h-7 items-center justify-between gap-6">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-32" />
      </div>
      <Skeleton className="mt-6 w-full rounded-2xl" style={{ height }} />
      <div className="mt-4 flex h-10 items-center justify-between gap-4">
        <Skeleton className="h-3 w-48" />
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  );
}

const CELL_WIDTHS = ['w-32', 'w-20', 'w-40', 'w-12', 'w-16', 'w-24'];

export function TableSkeleton({
  variant = 'full',
  rows = 5,
  columns = 4,
  className,
}: {
  variant?: 'full' | 'compact';
  rows?: number;
  columns?: number;
  className?: string;
}) {
  const full = variant === 'full';
  const cells = CELL_WIDTHS.slice(0, columns);
  return (
    <div className={cn('min-w-0', full && 'glass-strong p-4', className)}>
      {full ? (
        <Skeleton className="h-12 w-full" />
      ) : (
        <div className="flex h-10 items-center justify-between gap-6 border-b border-line-row">
          {cells.map((width) => (
            <Skeleton key={width} className={cn('h-3', width === 'w-32' ? 'w-16' : 'w-10')} />
          ))}
        </div>
      )}
      <div className={cn(full && 'mt-2')}>
        {Array.from({ length: rows }, (_, row) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: placeholders with no identity
            key={row}
            className={cn(
              'flex h-12 items-center justify-between gap-6 border-b border-line-row',
              full ? 'px-6' : '',
            )}
          >
            {cells.map((width) => (
              <Skeleton key={width} className={cn('h-3', width)} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function IdeaCardSkeleton({
  variant = 'creator',
  className,
}: {
  variant?: 'creator' | 'fan';
  className?: string;
}) {
  const creator = variant === 'creator';
  return (
    <div className={cn('glass flex min-w-0 flex-col rounded-[24px] p-5', className)}>
      <div className="flex h-6 items-center justify-between gap-3">
        <Skeleton className="h-6 w-28" />
        {creator ? <Skeleton className="h-6 w-16" /> : null}
      </div>
      <div className="mt-3 flex h-14 flex-col justify-center gap-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <div className="mt-1 flex h-[22px] items-center">
        <Skeleton className="h-3.5 w-4/5" />
      </div>
      <div className="mt-4 flex h-7 items-center gap-3">
        <Skeleton className="size-7" />
        <Skeleton className="h-3 w-44" />
      </div>
      <div className="flex gap-3 pt-5">
        <Skeleton className="h-12 w-24" />
        {creator ? <Skeleton className="h-12 w-36" /> : null}
      </div>
    </div>
  );
}

/** studio holds the pencil's row, bio the Join pill's. */
export function CommunityCardSkeleton({
  tint = 'white',
  variant = 'studio',
  className,
}: {
  tint?: CardTint;
  variant?: 'studio' | 'bio';
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex min-w-0 flex-col gap-10 rounded-card p-6',
        TINT_STYLES[tint].card,
        className,
      )}
    >
      <div className="flex items-center gap-4">
        <Skeleton className="size-14 rounded-md" />
        <Skeleton className="h-6 w-40" />
      </div>
      <div className={cn('flex items-center justify-between', variant === 'bio' ? 'h-12' : 'h-8')}>
        <Skeleton className="h-4 w-56" />
        {variant === 'bio' ? <Skeleton className="h-12 w-24" /> : null}
      </div>
    </div>
  );
}

/** The AI briefing card: H2, three highlights (chip, summary, reason, thumbs), the Regenerate pill. */
export function BriefingSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('glass min-w-0 p-6', className)}>
      <div className="flex h-7 items-center">
        <Skeleton className="h-5 w-48" />
      </div>
      <div className="mt-4">
        {['first', 'second', 'third'].map((key) => (
          <div key={key} className="flex items-center gap-4 border-b border-line-row py-4">
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Skeleton className="h-6 w-16" />
              <div className="flex h-[22px] items-center">
                <Skeleton className="h-3.5 w-4/5" />
              </div>
              <div className="flex h-[18px] items-center">
                <Skeleton className="h-3 w-3/5" />
              </div>
            </div>
            <Skeleton className="size-10 shrink-0" />
            <Skeleton className="size-10 shrink-0" />
          </div>
        ))}
      </div>
      <Skeleton className="mt-6 h-12 w-36" />
    </div>
  );
}
