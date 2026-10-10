import type { LucideIcon } from 'lucide-react';
import type * as React from 'react';
import { cn } from '@/components/ui/cn';
import { type CardTint, TINT_STYLES } from './tint';

export interface EmptyStateProps {
  icon: LucideIcon;
  tint?: CardTint;
  /** Optional short lead in Label Strong. */
  title?: string;
  /** One sentence that teaches: "No pitches yet. Your bio link has a Send a pitch button." */
  body: string;
  /** One action: a secondary Button or a link styled with buttonVariants. */
  action?: React.ReactNode;
  className?: string;
}

/**
 * DESIGN.md Empty state: a 56px icon tile in a pastel tint, one Body sentence, one action, centred where
 * the list would be. No illustration. Words are ink, so it reads on a card and on the bare shell alike;
 * give it the list's footprint through className (The Same Shape Rule).
 */
export function EmptyState({
  icon: Icon,
  tint = 'lavender',
  title,
  body,
  action,
  className,
}: EmptyStateProps) {
  const style = TINT_STYLES[tint];
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4 px-6 py-12 text-center',
        className,
      )}
    >
      <span className={cn('grid size-14 place-items-center rounded-md', style.tile)}>
        <Icon aria-hidden="true" strokeWidth={1.5} className={cn('size-6', style.icon)} />
      </span>
      <div className="flex max-w-[44ch] flex-col gap-1">
        {title ? <p className="text-label-strong text-ink">{title}</p> : null}
        <p className="text-body text-ink">{body}</p>
      </div>
      {action}
    </div>
  );
}
