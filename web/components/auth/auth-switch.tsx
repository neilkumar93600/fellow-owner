'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { cx, FOCUS_RING, LINK_HIT_AREA, TEXT_LINK } from './auth-classes';
import { safeReturnTo, withReturnTo } from './auth-return-to';

const ALT: Record<string, { lead: string; label: string; href: string }> = {
  '/login': { lead: 'New here?', label: 'Create account', href: '/create-account' },
  '/create-account': { lead: 'Have an account?', label: 'Log in', href: '/login' },
};

/** The safe `returnTo` from the URL. useSearchParams needs a Suspense boundary, hence the wrappers. */
function useReturnTo(): string | null {
  return safeReturnTo(useSearchParams().get('returnTo'));
}

/**
 * Under the form, as in the reference: "New here? Create account" on /login and "Have an account? Log in"
 * on /create-account. A safe `returnTo` rides along. Nothing on other screens.
 */
export function AuthAltLink({ className }: { className?: string }) {
  const item = ALT[usePathname()];
  if (!item) return null;
  return (
    <Suspense fallback={<AltLink item={item} returnTo={null} className={className} />}>
      <AltWithReturnTo item={item} className={className} />
    </Suspense>
  );
}

function AltWithReturnTo(props: { item: (typeof ALT)[string]; className?: string }) {
  return <AltLink {...props} returnTo={useReturnTo()} />;
}

function AltLink({
  item,
  returnTo,
  className,
}: {
  item: (typeof ALT)[string];
  returnTo: string | null;
  className?: string;
}) {
  return (
    <p className={cx('text-center text-body text-ink-soft', className)}>
      {item.lead}{' '}
      <Link href={withReturnTo(item.href, returnTo)} className={cx(TEXT_LINK, LINK_HIT_AREA)}>
        {item.label}
      </Link>
    </p>
  );
}

/** Top right of the form column on the code and password screens: back to /login, keeping returnTo. */
export function AuthBackLink() {
  if (ALT[usePathname()]) return null;
  return (
    <Suspense fallback={<BackLink returnTo={null} />}>
      <BackWithReturnTo />
    </Suspense>
  );
}

function BackWithReturnTo() {
  return <BackLink returnTo={useReturnTo()} />;
}

function BackLink({ returnTo }: { returnTo: string | null }) {
  return (
    <Link
      href={withReturnTo('/login', returnTo)}
      className={cx(
        'press inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-full px-4 text-label text-ink transition-colors duration-150 hover:bg-page',
        FOCUS_RING,
      )}
    >
      <ArrowLeft aria-hidden size={18} strokeWidth={1.5} />
      Back to log in
    </Link>
  );
}

const LINES: Record<string, string> = {
  '/login': 'Fans find their people. You find the ideas worth your spotlight.',
  '/create-account':
    'Join a creator’s communities, or start your own space. One account does both.',
  '/verify-otp': 'The best of your DMs, sorted, with the reason for each pick.',
  '/forgot-password': 'Spotlight what your fans make, and see how it landed.',
  '/reset-password': 'Spotlight what your fans make, and see how it landed.',
};

/** This screen's line on the picture's caption card (AuthPanel is a server component). */
export function AuthPanelLine({ className }: { className?: string }) {
  const pathname = usePathname();
  return <p className={className}>{LINES[pathname] ?? LINES['/login']}</p>;
}
