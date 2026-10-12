'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { notificationPrefsKeys } from '@/hooks/queries/use-notification-prefs';
import { unsubscribeWithToken } from '@/lib/api/notification-prefs';
import { ApiError } from '@/lib/fetcher';
import { routes } from '@/lib/routes';

/**
 * The button behind the unsubscribe link in notification emails. Opening the link changes nothing
 * (mail link scanners open every link); this POST unsubscribes, then the page shows the outcome.
 * Only a 400 means a bad link; a network or server failure keeps the token so the click can be retried.
 */
export function UnsubscribeButton({ token }: { token: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function onClick() {
    setPending(true);
    setFailed(false);
    try {
      await unsubscribeWithToken(token);
    } catch (error) {
      if (error instanceof ApiError && error.status === 400) {
        router.replace(routes.emailPrefs('invalid'));
      } else {
        setFailed(true);
        setPending(false);
      }
      return;
    }
    // The signed-in switches on this same page must not keep showing "on" (a toggle would re-subscribe).
    void queryClient.invalidateQueries({ queryKey: notificationPrefsKeys.all });
    router.replace(routes.emailPrefs('unsubscribed'));
  }

  return (
    <>
      <Button type="button" loading={pending} onClick={onClick} className="mt-6">
        Unsubscribe from notification emails
      </Button>
      {failed ? (
        <p role="alert" className="mt-3 text-small text-ink-soft">
          Could not reach the server. Try again.
        </p>
      ) : null}
    </>
  );
}
