import { RefreshCw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/ui/cn';

export type AiChipKind = 'pick' | 'suggested' | 'reviewing' | 'not-analyzed';

const WORDS: Record<AiChipKind, string> = {
  pick: 'AI pick',
  suggested: 'AI suggested',
  reviewing: 'AI reviewing',
  'not-analyzed': 'Not analyzed',
};

const KIND_CLASSES: Record<AiChipKind, string> = {
  pick: 'bg-aurora-peach',
  suggested: 'bg-aurora-peach',
  // The sweep utility moves a Dove Grey band behind the words; static under reduced motion.
  reviewing: 'sweep glass-chip',
  'not-analyzed': 'bg-white/70',
};

export interface AiChipProps {
  kind: AiChipKind;
  /** Own words, such as a suggested tile's label; defaults per kind. */
  label?: string;
  /** Not analyzed only: shows the owner's Retry ghost. Set `kind` to `reviewing` while it runs. */
  onRetry?: () => void;
  className?: string;
}

/**
 * DESIGN.md AI chip, 24px Caption in ink. "AI pick" and "AI suggested" are aurora peach with the 14px Sparkles
 * (the only Sparkles in the product); always render the reason line beside them (The Reason Travels
 * Rule). "AI reviewing" is a glass chip with a sweeping band; "Not analyzed" is white at 70%, plus Retry.
 */
export function AiChip({ kind, label, onRetry, className }: AiChipProps) {
  const chip = (
    <span
      className={cn(
        'inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-caption whitespace-nowrap text-ink',
        KIND_CLASSES[kind],
        !(kind === 'not-analyzed' && onRetry) && className,
      )}
    >
      {kind === 'pick' || kind === 'suggested' ? (
        <Sparkles aria-hidden="true" strokeWidth={1.5} className="size-3.5" />
      ) : null}
      {label ?? WORDS[kind]}
    </span>
  );

  if (kind !== 'not-analyzed' || !onRetry) return chip;
  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      {chip}
      <Button variant="ghost" size="md" icon={<RefreshCw />} onClick={onRetry}>
        Retry
      </Button>
    </span>
  );
}
