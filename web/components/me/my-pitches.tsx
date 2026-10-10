'use client';

import { PITCH_TYPE_LABELS, type Pitch } from '@fellow-owners/shared';
import { Send, Undo2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { buttonVariants } from '@/components/ui/button-variants';
import { cn } from '@/components/ui/cn';
import { useWithdrawPitch } from '@/hooks/queries/use-pitches';
import { formatDate, formatNumber, pluralize } from '@/lib/format';
import { routes } from '@/lib/routes';
import { PitchTracker } from './pitch-tracker';

export interface MyPitchesProps {
  handle: string;
  /** The creator's first name: "Mira". */
  creatorName: string;
  pitches: Pitch[];
  /** MySpace.caps.pitchesLeftToday */
  pitchesLeftToday: number;
  /** The creator's setting: whether the tracker draws a Read step. */
  showReadReceipts: boolean;
}

/**
 * Ideas I sent: today's allowance, then each idea with its type, subject and date, a tracker showing how
 * far it got (Sent, Read, Shortlisted, Replied), the creator's reply quoted in a lilac well, and
 * Withdraw (confirmed) while the idea is still New.
 */
export function MyPitches({
  handle,
  creatorName,
  pitches,
  pitchesLeftToday,
  showReadReceipts,
}: MyPitchesProps) {
  const [withdrawing, setWithdrawing] = useState<Pitch | null>(null);
  const withdrawMutation = useWithdrawPitch();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-body text-ink">
          <span className="tabular-nums">{formatNumber(pitchesLeftToday)}</span>{' '}
          {pluralize(pitchesLeftToday, 'idea')} left today
        </p>
        <Link
          href={routes.fan.pitch(handle)}
          className={cn(buttonVariants({ variant: 'secondary', surface: 'glass' }), 'h-11')}
        >
          <Send aria-hidden="true" className="size-4" />
          Send an idea
        </Link>
      </div>

      {pitches.length ? (
        <ul className="flex flex-col gap-4">
          {pitches.map((pitch) => (
            <li key={pitch.id}>
              <article className="min-w-0 glass p-5">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <p className="text-small text-ink-soft">
                    <span className="text-small-strong text-ink">
                      {PITCH_TYPE_LABELS[pitch.type]}
                    </span>
                    {' · '}
                    <time dateTime={pitch.createdAt} suppressHydrationWarning>
                      {formatDate(pitch.createdAt)}
                    </time>
                  </p>
                </div>
                <h3 className="mt-2 text-h2 text-ink">{pitch.subject}</h3>
                <p className="mt-1 line-clamp-3 max-w-[68ch] text-body text-ink-soft">
                  {pitch.body}
                </p>

                <PitchTracker
                  pitch={pitch}
                  showReadReceipts={showReadReceipts}
                  className="mt-5 max-w-[30rem]"
                />
                {pitch.status === 'archived' ? (
                  <p className="mt-3 max-w-[68ch] text-small text-ink-soft">
                    {creatorName}
                    {showReadReceipts && pitch.readAt ? ' read this and' : ''} isn’t taking it
                    further. Your next idea is welcome.
                  </p>
                ) : null}

                {pitch.creatorReply ? (
                  // The summary-well pattern: an inset, not a card. Only ink and ink-soft on lilac.
                  <figure className="mt-4 rounded-lg bg-aurora-lilac/40 px-4 py-3">
                    <figcaption className="text-small text-ink-soft">
                      <span className="text-small-strong text-ink">{creatorName} replied</span>
                      {pitch.repliedAt ? (
                        <>
                          {' · '}
                          <time dateTime={pitch.repliedAt} suppressHydrationWarning>
                            {formatDate(pitch.repliedAt)}
                          </time>
                        </>
                      ) : null}
                    </figcaption>
                    <blockquote className="mt-1 max-w-[68ch] text-body text-ink">
                      {pitch.creatorReply}
                    </blockquote>
                    {pitch.answeredGroup ? (
                      <p className="mt-2 text-small text-ink-soft">
                        {creatorName} answered this for{' '}
                        <span className="tabular-nums">
                          {formatNumber(pitch.answeredGroup.count)}
                        </span>{' '}
                        people ·{' '}
                        <Link
                          href={pitch.answeredGroup.postHref}
                          className="font-medium text-ink underline decoration-ink/30 underline-offset-4 hover:decoration-ink"
                        >
                          See the post
                        </Link>
                      </p>
                    ) : null}
                  </figure>
                ) : null}

                {pitch.canWithdraw && pitch.status === 'new' ? (
                  <Button
                    variant="destructive"
                    icon={<Undo2 />}
                    className="mt-4 -ml-4 h-11"
                    onClick={() => setWithdrawing(pitch)}
                  >
                    Withdraw<span className="sr-only">: {pitch.subject}</span>
                  </Button>
                ) : null}
              </article>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={Send}
          body={`No ideas sent yet. When you send ${creatorName} one, it shows up here with the reply.`}
          className="glass min-h-64"
        />
      )}

      <ConfirmDialog
        open={withdrawing !== null}
        onOpenChange={(open) => {
          if (!open) setWithdrawing(null);
        }}
        title="Withdraw this idea?"
        body={`It leaves ${creatorName}'s inbox. You can send a new one later.`}
        confirmLabel="Withdraw idea"
        icon={<Undo2 />}
        onConfirm={() => {
          if (withdrawing) {
            withdrawMutation.mutate(withdrawing.id, {
              onSuccess: () => {
                setWithdrawing(null);
              },
            });
          }
        }}
      />
    </div>
  );
}
