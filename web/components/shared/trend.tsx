import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '@/components/ui/cn';
import { formatChange } from '@/lib/format';

const ICONS = { up: TrendingUp, down: TrendingDown, flat: Minus } as const;

export interface TrendProps {
  /** Percentage change; null (nothing to compare with) renders nothing. */
  changePct: number | null;
  /** "vs last week", "this month". */
  descriptor?: string;
  /** Lavender cards: a rising figure turns ink and the descriptor ink-soft; the arrow stays green. */
  surface?: 'default' | 'lavender';
  /** `trend` is the stat card row (20px arrow, 18px figure, Body descriptor); `small` fits rows and meta lines. */
  size?: 'trend' | 'small';
  className?: string;
}

/**
 * DESIGN.md Stat card trend row. Rising: a trending-up arrow and "+18%" in success-ink. Falling: a
 * trending-down arrow and "−4%" (U+2212) in ink, never red. Flat: a minus and "0%" in ink-soft. The sign
 * lives in the text and the arrow is hidden, so a screen reader hears the direction. For white, Paper
 * White, apricot and aqua surfaces (success-ink fails on glass and the shell).
 */
export function Trend({
  changePct,
  descriptor,
  surface = 'default',
  size = 'trend',
  className,
}: TrendProps) {
  if (changePct === null) return null;
  const { text, direction } = formatChange(changePct);
  const Icon = ICONS[direction];
  const lavender = surface === 'lavender';
  const figure =
    direction === 'up'
      ? lavender
        ? 'text-ink'
        : 'text-success-ink'
      : direction === 'down'
        ? 'text-ink'
        : 'text-ink-soft';
  const arrow =
    direction === 'up' ? 'text-success-ink' : direction === 'down' ? 'text-ink' : 'text-ink-soft';

  return (
    <span
      className={cn('inline-flex items-center', size === 'trend' ? 'gap-2' : 'gap-1.5', className)}
    >
      <Icon
        aria-hidden="true"
        strokeWidth={1.5}
        className={cn('shrink-0', size === 'trend' ? 'size-5' : 'size-4', arrow)}
      />
      <span className={cn(size === 'trend' ? 'text-trend' : 'text-small-strong', figure)}>
        {text}
      </span>
      {descriptor ? (
        <span
          className={cn(
            size === 'trend' ? 'text-body' : 'text-small',
            lavender ? 'text-ink-soft' : 'text-ink-muted',
          )}
        >
          {descriptor}
        </span>
      ) : null}
    </span>
  );
}
