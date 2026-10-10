import { cn } from '@/components/ui/cn';
import { MATCH_LABELS, matchTier } from './match-label-core.mjs';

export type MatchTier = 'strong' | 'worth' | 'not';
export { MATCH_LABELS, matchTier };

const DOT: Record<MatchTier, string> = {
  strong: 'bg-success',
  worth: 'bg-sky',
  not: 'bg-ink-soft/50',
};

export interface MatchLabelProps {
  /** The 0 to 100 match score. Never shown as a number here; null or undefined renders nothing. */
  score: number | null | undefined;
  className?: string;
}

/**
 * DESIGN.md Match label (creator side only): a glass chip with words, never a number. 80 and up "Strong
 * match", 60 to 79 "Worth a look", under 60 "Not for you". The dot repeats the tier; the words carry it.
 */
export function MatchLabel({ score, className }: MatchLabelProps) {
  const tier = matchTier(score);
  if (!tier) return null;
  return (
    <span
      className={cn(
        'glass-chip inline-flex h-7 shrink-0 items-center gap-1.5 px-3 text-caption whitespace-nowrap text-ink',
        className,
      )}
    >
      <span aria-hidden="true" className={cn('size-1.5 rounded-full', DOT[tier])} />
      {MATCH_LABELS[tier]}
    </span>
  );
}
