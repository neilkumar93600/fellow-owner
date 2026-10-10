import { Tooltip } from '@/components/ui/tooltip';
import { MatchLabel } from './match-label';

export { MatchLabel };

export interface FitPillProps {
  /** 0 to 100; shown as words ("Strong match"), never as a number. */
  score: number | null | undefined;
  /** The one-line "why this one", in a tooltip on hover and keyboard focus. */
  reason?: string | null;
  className?: string;
}

/**
 * Legacy name for the match label: callers that still render <FitPill score reason /> get the Golden
 * Hour Frost MatchLabel (words, no number) with the reason in a tooltip. New code uses MatchLabel and
 * shows the reason as its own line. Fit numbers belong in side panels only.
 */
export function FitPill({ score, reason, className }: FitPillProps) {
  const label = <MatchLabel score={score} className={className} />;
  if (!reason || score == null) return label;
  return (
    <Tooltip content={reason}>
      {/* biome-ignore lint/a11y/noNoninteractiveTabindex: focusable so keyboard users reach the reason */}
      <span tabIndex={0} className="inline-flex shrink-0 rounded-full">
        {label}
      </span>
    </Tooltip>
  );
}
