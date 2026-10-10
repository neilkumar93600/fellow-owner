import type { Pitch } from '@fellow-owners/shared';
import { Check, Minus, Undo2 } from 'lucide-react';
import { cn } from '@/components/ui/cn';
import { formatDate } from '@/lib/format';

type StepState = 'done' | 'current' | 'todo' | 'end';

interface Step {
  label: string;
  state: StepState;
  at: string | null;
}

export type TrackedPitch = Pick<
  Pitch,
  'status' | 'createdAt' | 'readAt' | 'shortlistedAt' | 'repliedAt'
>;

const SR_STATE: Record<StepState, string> = {
  done: 'done',
  current: 'current step',
  todo: 'not yet',
  end: 'final',
};

/**
 * Where a pitch is, as its sender sees it: Sent, Read, Shortlisted, Replied. Read is drawn only when the
 * creator shows read receipts. A direct reply skips Shortlisted rather than faking it; Closed (archived)
 * and Withdrawn end the line early. A spam-filtered pitch reaches the sender as plain `new`, so it
 * simply stays at Sent.
 */
export function trackerSteps(pitch: TrackedPitch, showReadReceipts: boolean): Step[] {
  const sent: Step = { label: 'Sent', state: 'done', at: pitch.createdAt };
  const readAt = showReadReceipts ? (pitch.readAt ?? null) : null;
  const read: Step[] = readAt ? [{ label: 'Read', state: 'done', at: readAt }] : [];

  switch (pitch.status) {
    case 'withdrawn':
      return [sent, { label: 'Withdrawn', state: 'end', at: null }];
    case 'archived':
      return [sent, ...read, { label: 'Closed', state: 'end', at: null }];
    case 'replied':
      return [
        sent,
        ...read,
        ...(pitch.shortlistedAt
          ? [{ label: 'Shortlisted', state: 'done' as const, at: pitch.shortlistedAt }]
          : []),
        { label: 'Replied', state: 'done', at: pitch.repliedAt },
      ];
    case 'shortlisted':
      return [
        sent,
        ...read,
        { label: 'Shortlisted', state: 'current', at: pitch.shortlistedAt ?? null },
        { label: 'Replied', state: 'todo', at: null },
      ];
    default: {
      const later: Step[] = [
        { label: 'Shortlisted', state: 'todo', at: null },
        { label: 'Replied', state: 'todo', at: null },
      ];
      if (readAt) return [sent, { label: 'Read', state: 'current', at: readAt }, ...later];
      const waiting: Step = { ...sent, state: 'current' };
      return showReadReceipts
        ? [waiting, { label: 'Read', state: 'todo', at: null }, ...later]
        : [waiting, ...later];
    }
  }
}

/**
 * A horizontal step line that fits a 360px phone. Done steps are ink dots with a check; the current
 * step is Lime with an ink ring ("you are here", the one Lime on the card); later steps are hollow.
 * Every step says its state in words for screen readers, so colour is never the only cue.
 */
export function PitchTracker({
  pitch,
  showReadReceipts,
  className,
}: {
  pitch: TrackedPitch;
  showReadReceipts: boolean;
  className?: string;
}) {
  const steps = trackerSteps(pitch, showReadReceipts);
  return (
    <ol
      aria-label="Idea progress"
      className={cn('grid', className)}
      style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
    >
      {steps.map((step, index) => {
        const next = steps[index + 1];
        return (
          <li
            key={step.label}
            aria-current={step.state === 'current' ? 'step' : undefined}
            className="relative flex min-w-0 flex-col items-center text-center"
          >
            {next ? (
              <span
                aria-hidden="true"
                className={cn(
                  'absolute top-[11px] left-1/2 h-0.5 w-full',
                  next.state === 'todo' ? 'bg-ink/20' : 'bg-ink',
                )}
              />
            ) : null}
            <Dot state={step.state} label={step.label} />
            <span
              className={cn(
                'mt-2 max-w-full truncate px-1',
                step.state === 'todo' ? 'text-small text-ink-soft' : 'text-small-strong text-ink',
              )}
            >
              {step.label}
              <span className="sr-only">: {SR_STATE[step.state]}</span>
            </span>
            {step.at ? (
              <time
                dateTime={step.at}
                suppressHydrationWarning
                className="text-caption text-ink-soft tabular-nums"
              >
                {formatDate(step.at)}
              </time>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function Dot({ state, label }: { state: StepState; label: string }) {
  const base = 'relative z-10 grid size-6 shrink-0 place-items-center rounded-full';
  const icon = { 'aria-hidden': true, strokeWidth: 2.5, className: 'size-3.5' } as const;
  switch (state) {
    case 'done':
      return (
        <span className={cn(base, 'bg-ink text-white')}>
          <Check {...icon} />
        </span>
      );
    case 'current':
      return (
        <span className={cn(base, 'border-2 border-ink bg-aurora-peach')}>
          <span aria-hidden="true" className="size-2 rounded-full bg-ink" />
        </span>
      );
    case 'end':
      return (
        <span className={cn(base, 'border-2 border-ink/40 bg-white/60 text-ink-soft')}>
          {label === 'Withdrawn' ? <Undo2 {...icon} /> : <Minus {...icon} />}
        </span>
      );
    default:
      return <span className={cn(base, 'border-2 border-ink/40 bg-white')} />;
  }
}
