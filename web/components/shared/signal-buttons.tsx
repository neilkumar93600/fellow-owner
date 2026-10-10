'use client';

import { SIGNAL_KINDS, SIGNAL_LABELS, type SignalKind } from '@fellow-owners/shared';
import { Check, Plus } from 'lucide-react';
import { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/ui/cn';
import { formatCompact } from '@/lib/format';

export interface SignalButtonsProps {
  useCount: number;
  buildCount: number;
  /** The viewer's own signals (PostCard.viewerSignals). With `onToggle` these are the truth, so keep them current. */
  viewerSignals: SignalKind[];
  /** Dimmed at 50%; say why in `disabledReason` (members only, your own post). */
  disabled?: boolean;
  disabledReason?: string;
  /**
   * Hands the toggle to the parent, who owns the state: the counts and pressed signals follow the props
   * (an optimistic cache write, reverted on failure). Without it the pair toggles locally (kit demos).
   */
  onToggle?: (kind: SignalKind, on: boolean) => void;
  className?: string;
}

/**
 * "I'd use this" and "I'd help build": two 44px secondary pills with tabular counts and aria-pressed. A
 * pressed signal takes the selected-chip look (ink fill, white words). Counts move with the viewer's own
 * toggles; the reason for a disabled pair sits beside it at full opacity, linked by
 * aria-describedby.
 */
export function SignalButtons({
  useCount,
  buildCount,
  viewerSignals,
  disabled = false,
  disabledReason,
  onToggle,
  className,
}: SignalButtonsProps) {
  const [local, setLocal] = useState<SignalKind[]>(viewerSignals);
  const reasonId = useId();
  const loaded = { use: useCount, build: buildCount };
  const on = onToggle ? viewerSignals : local;

  function count(kind: SignalKind): number {
    if (onToggle) return loaded[kind];
    // The loaded count already includes the viewer's loaded signal.
    return loaded[kind] + Number(local.includes(kind)) - Number(viewerSignals.includes(kind));
  }

  function toggle(kind: SignalKind) {
    const next = !on.includes(kind);
    if (onToggle) onToggle(kind, next);
    else setLocal((current) => (next ? [...current, kind] : current.filter((k) => k !== kind)));
  }

  const showReason = disabled && disabledReason;
  return (
    <div className={cn('flex flex-wrap items-center gap-3', className)}>
      {SIGNAL_KINDS.map((kind) => {
        const pressed = on.includes(kind);
        return (
          <Button
            key={kind}
            variant="secondary"
            surface="card"
            aria-pressed={pressed}
            aria-describedby={showReason ? reasonId : undefined}
            disabled={disabled}
            icon={pressed ? <Check /> : <Plus />}
            onClick={() => toggle(kind)}
            className={cn(
              'h-11',
              pressed &&
                'border-ink bg-ink text-white aria-pressed:not-disabled:not-aria-disabled:hover:bg-ink',
            )}
          >
            {SIGNAL_LABELS[kind]}
            <span className={cn('text-small-strong', pressed ? 'text-white' : 'text-ink-soft')}>
              {formatCompact(count(kind))}
            </span>
          </Button>
        );
      })}
      {showReason ? (
        <p id={reasonId} className="text-small text-ink-soft">
          {disabledReason}
        </p>
      ) : null}
    </div>
  );
}
