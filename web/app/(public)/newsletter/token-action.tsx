'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/fetcher';
import { routes } from '@/lib/routes';

/**
 * The button behind a newsletter email link. Opening the link changes nothing (mail link
 * scanners open every link); only this POST confirms or unsubscribes. Any failure is a bad link.
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

  async function onClick() {
    setPending(true);
    try {
      await apiFetch(`/api/newsletter/${action}?token=${encodeURIComponent(token)}`, {
        method: 'POST',
      });
      router.replace(routes.newsletter(action === 'confirm' ? 'confirmed' : 'unsubscribed'));
    } catch {
      router.replace(routes.newsletter('invalid'));
    }
  }

  return (
    <Button type="button" loading={pending} onClick={onClick} className="mt-6">
      {label}
    </Button>
  );
}
