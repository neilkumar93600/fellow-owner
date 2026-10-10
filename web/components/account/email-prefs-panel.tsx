'use client';

import Link from 'next/link';
import { EmailPrefsCard } from '@/components/account/email-prefs-card';
import { buttonVariants } from '@/components/ui/button-variants';
import { cn } from '@/components/ui/cn';
import { useSession } from '@/lib/auth-client';
import { routes } from '@/lib/routes';

/** /email-preferences: the email switches for a signed-in person, a sign-in link for anyone else. */
export function EmailPrefsPanel() {
  const { data: session, isPending } = useSession();
  if (isPending) return null;
  if (!session) {
    return (
      <div className="mt-6 flex flex-col items-start gap-3">
        <p className="text-body text-ink">Sign in to choose which emails you get.</p>
        <Link
          href={routes.auth.login(routes.emailPrefs())}
          className={cn(buttonVariants({ variant: 'secondary' }))}
        >
          Sign in
        </Link>
      </div>
    );
  }
  return (
    <div className="mt-6 grid grid-cols-12 gap-5">
      <EmailPrefsCard />
    </div>
  );
}
