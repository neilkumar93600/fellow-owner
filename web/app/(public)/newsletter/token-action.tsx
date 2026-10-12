'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ApiError, apiFetch } from '@/lib/fetcher';
import { routes } from '@/lib/routes';

/**
 * The button behind a newsletter email link. Opening the link changes nothing (mail link
 * scanners open every link); only this POST confirms or unsubscribes. Only a 400 is a bad link;
 * a network or server failure keeps the token on the page so the click can be retried.
 */
export function NewsletterTokenAction({
  action,
  token,
  label,
}: {
  action: 'confirm' | 'unsubscribe';
  token: string;
  label: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function onClick() {
    setPending(true);
    setFailed(false);
    try {
      await apiFetch(`/api/newsletter/${action}?token=${encodeURIComponent(token)}`, {
        method: 'POST',
      });
      router.replace(routes.newsletter(action === 'confirm' ? 'confirmed' : 'unsubscribed'));
    } catch (error) {
      if (error instanceof ApiError && error.status === 400) {
        router.replace(routes.newsletter('invalid'));
      } else {
        setFailed(true);
        setPending(false);
      }
    }
  }

  return (
    <>
      <Button type="button" loading={pending} onClick={onClick} className="mt-6">
        {label}
      </Button>
      {failed ? (
        <p role="alert" className="mt-3 text-small text-ink-soft">
          Could not reach the server. Try again.
        </p>
      ) : null}
    </>
  );
}
