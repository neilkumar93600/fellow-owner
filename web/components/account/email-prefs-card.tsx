'use client';

import { EMAIL_NOTIFICATION_KINDS, type EmailNotificationKind } from '@fellow-owners/shared';
import { Mail } from 'lucide-react';
import { useId } from 'react';
import { AccountCard } from '@/components/account/account-card';
import { Button } from '@/components/ui/button';
import {
  useNotificationPrefs,
  useUpdateNotificationPrefs,
} from '@/hooks/queries/use-notification-prefs';

const KIND_LABELS: Record<EmailNotificationKind, string> = {
  reply_received: 'A creator replies to your idea or pitch',
  project_featured: 'A creator features your fan project',
  spotlighted: 'A creator gives you a shout-out',
  challenge_shortlisted: 'Your challenge entry makes the shortlist',
  team_decision: 'A crew request is accepted or declined',
};

/**
 * Account page: which notifications also arrive by email. One digest at most an hour, never for
 * something you have already read, and every email has an unsubscribe link. Each switch saves at once.
 */
export function EmailPrefsCard() {
  const prefs = useNotificationPrefs();
  const update = useUpdateNotificationPrefs();
  const groupId = useId();
  const data = prefs.data;

  const save = (emailEnabled: boolean, kinds: Partial<Record<EmailNotificationKind, boolean>>) =>
    update.mutate({ emailEnabled, kinds });

  return (
    <AccountCard icon={Mail} tint="peach" title="Notification emails" wide>
      <p className="text-body text-ink">
        We email a short digest of what you have not read yet, at most once an hour. Sign-in codes
        always arrive by email.
      </p>

      {prefs.isPending ? (
        <p className="mt-3 text-body text-ink-soft">Loading your settings…</p>
      ) : prefs.isError || !data ? (
        <div className="mt-3 flex flex-col items-start gap-3">
          <p className="text-body text-ink">Couldn’t load your email settings.</p>
          <Button variant="secondary" surface="card" onClick={() => prefs.refetch()}>
            Try again
          </Button>
        </div>
      ) : (
        <div className="mt-3 flex w-full flex-col gap-2">
          {data.unsubscribed ? (
            <p className="text-body text-ink">
              You unsubscribed from these emails. Turn them back on to get a digest again.
            </p>
          ) : null}
          <label
            htmlFor={`${groupId}-enabled`}
            className="flex min-h-10 items-center gap-3 text-body text-ink"
          >
            <input
              id={`${groupId}-enabled`}
              type="checkbox"
              checked={data.emailEnabled}
              onChange={(event) => save(event.target.checked, data.kinds)}
              className="size-5 shrink-0 accent-ink"
            />
            Email me about new activity
          </label>
          <fieldset
            disabled={!data.emailEnabled}
            className="flex flex-col gap-2 pl-8 disabled:opacity-60"
          >
            <legend className="sr-only">Which emails to send</legend>
            {EMAIL_NOTIFICATION_KINDS.map((kind) => (
              <label
                key={kind}
                htmlFor={`${groupId}-${kind}`}
                className="flex min-h-10 items-center gap-3 text-body text-ink"
              >
                <input
                  id={`${groupId}-${kind}`}
                  type="checkbox"
                  checked={data.kinds[kind]}
                  onChange={(event) =>
                    save(data.emailEnabled, { ...data.kinds, [kind]: event.target.checked })
                  }
                  className="size-5 shrink-0 accent-ink"
                />
                {KIND_LABELS[kind]}
              </label>
            ))}
          </fieldset>
        </div>
      )}
    </AccountCard>
  );
}
