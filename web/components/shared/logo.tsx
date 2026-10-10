import { cn } from '@/lib/utils';

/**
 * Placeholder mark from 04-ui-ux-brief §10: two overlapping circles in ink, plus the wordmark.
 * Swap the mark for the chosen mascot once it is picked.
 */
export function Logo({
  className,
  withWordmark = true,
}: {
  className?: string;
  withWordmark?: boolean;
}) {
  return (
    <span className={cn('inline-flex items-center gap-2.5 text-ink', className)}>
      <svg
        viewBox="0 0 34 22"
        aria-hidden="true"
        className="h-[22px] w-[34px] shrink-0"
        fill="none"
      >
        <circle cx="11" cy="11" r="9.25" stroke="currentColor" strokeWidth="2.5" />
        <circle cx="23" cy="11" r="9.25" fill="currentColor" fillOpacity="0.92" />
      </svg>
      {withWordmark ? (
        <span className="text-[17px] leading-none font-semibold tracking-[-0.02em]">
          Fellow Owners
        </span>
      ) : null}
    </span>
  );
}
