import {
  INBOX_TAB_LABELS,
  PITCH_STATUS_LABELS,
  POST_STATUS_LABELS,
  PROMOTION_STATE_LABELS,
  TEAM_STATUS_LABELS,
} from '@fellow-owners/shared';
import { cn } from '@/components/ui/cn';

export type StatusTone = 'warm' | 'cool' | 'neutral';

/** Every status the product shows, with its words from the shared *_LABELS. */
const LABELS: Record<string, string> = {
  ...PITCH_STATUS_LABELS,
  ...TEAM_STATUS_LABELS,
  ...PROMOTION_STATE_LABELS,
  ...POST_STATUS_LABELS,
  pending: 'Pending',
  filtered: INBOX_TAB_LABELS.filtered,
};

/**
 * Warm waits on someone (new, requested, pending; an open post still forming its team), cool has moved
 * forward (shortlisted, accepted, replied, live; a post being built or launched), neutral is at rest.
 */
const TONES: Record<string, StatusTone> = {
  new: 'warm',
  requested: 'warm',
  pending: 'warm',
  open: 'warm',
  forming_team: 'warm',
  shortlisted: 'cool',
  accepted: 'cool',
  replied: 'cool',
  live: 'cool',
  building: 'cool',
  launched: 'cool',
};

const TONE_CLASSES: Record<StatusTone, string> = {
  warm: 'bg-aurora-peach text-ink',
  cool: 'bg-aurora-sky text-ink',
  neutral: 'bg-white/75 text-ink ring-1 ring-ink/10 ring-inset',
};

export interface StatusPillProps {
  /** A pitch, team, promotion or post status, or `pending` / `filtered`. */
  status: string;
  /** Overrides the shared label. */
  label?: string;
  /** Overrides the tone the status maps to (anything unknown is neutral). */
  tone?: StatusTone;
  className?: string;
}

/** DESIGN.md Status pill: 24px, 10px side padding, Caption; ink words on an aurora tint (12:1 or more), never bare colour. */
export function StatusPill({ status, label, tone, className }: StatusPillProps) {
  const words =
    label ?? LABELS[status] ?? status.replaceAll('_', ' ').replace(/^./, (c) => c.toUpperCase());
  return (
    <span
      className={cn(
        'inline-flex h-6 shrink-0 items-center rounded-full px-2.5 text-caption whitespace-nowrap',
        TONE_CLASSES[tone ?? TONES[status] ?? 'neutral'],
        className,
      )}
    >
      {words}
    </span>
  );
}
