'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { unsubscribeWithToken } from '@/lib/api/notification-prefs';
import { routes } from '@/lib/routes';

/**
 * The button behind the unsubscribe link in notification emails. Opening the link changes nothing
 * (mail link scanners open every link); this POST unsubscribes, then the page shows the outcome.
 */
export function UnsubscribeButton({ token }: { token: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onClick() {
    setPending(true);
    let status = 'unsubscribed';
    try {
      await unsubscribeWithToken(token);
    } catch {
      status = 'invalid';
    }
    router.replace(routes.emailPrefs(status));
  }

  return (
    <Button type="button" loading={pending} onClick={onClick} className="mt-6">
      Unsubscribe from notification emails
    </Button>
  );
}
