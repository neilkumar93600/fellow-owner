'use client';

import { Info } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useInAppBrowser } from '@/hooks/use-in-app-browser';
import { authClient } from '@/lib/auth-client';
import { cx } from './auth-classes';
import { runAuth } from './auth-errors';
import { DEFAULT_DESTINATION, withReturnTo } from './auth-return-to';
import { AuthAlert, FOCUS_RING, OrDivider, Spinner } from './auth-ui';

/** Google's "G" mark (lucide has no brand icons). Decorative: the label names the provider. */
function GoogleMark() {
  return (
    <svg aria-hidden viewBox="0 0 18 18" className="size-[18px] shrink-0">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91c1.7-1.57 2.69-3.87 2.69-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.8.54-1.84.86-3.05.86-2.34 0-4.33-1.58-5.04-3.71H.96v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.96 10.71A5.41 5.41 0 0 1 3.68 9c0-.59.1-1.17.28-1.71V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.04l3-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58A8.65 8.65 0 0 0 9 0 9 9 0 0 0 .96 4.96l3 2.33C4.67 5.16 6.66 3.58 9 3.58z"
      />
    </svg>
  );
}

/**
 * "or" + Continue with Google. Inside Instagram, TikTok and YouTube webviews Google blocks OAuth, so the
 * button is replaced by a one-line note. The server passes its user agent check as `initialInApp`, so the
 * right version renders from the first paint; the client check then confirms it.
 */
export function GoogleButton({
  returnTo,
  initialInApp,
  className,
}: {
  returnTo: string | null;
  initialInApp: boolean;
  className?: string;
}) {
  const detected = useInAppBrowser();
  const inApp = detected ?? initialInApp;
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  // Coming back from Google with the browser's Back button restores this page from the bfcache.
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) setPending(false);
    };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, []);

  if (inApp) {
    return (
      <p
        className={cx('flex items-start justify-center gap-2 text-small text-ink-muted', className)}
      >
        <Info aria-hidden size={16} strokeWidth={1.5} className="mt-px shrink-0" />
        <span>Using Instagram or TikTok’s browser? Email codes work here.</span>
      </p>
    );
  }

  async function onClick() {
    if (pending) return;
    setPending(true);
    setFailed(false);
    const result = await runAuth((fetchOptions) =>
      authClient.signIn.social({
        provider: 'google',
        callbackURL: returnTo ?? DEFAULT_DESTINATION,
        errorCallbackURL: withReturnTo('/login', returnTo),
        fetchOptions,
      }),
    );
    // On success the client follows Google's redirect, so the button stays busy until the page leaves.
    if (!result.ok) {
      setPending(false);
      setFailed(true);
    }
  }

  return (
    <div className={className}>
      <OrDivider />
      <button
        type="button"
        onClick={onClick}
        aria-busy={pending || undefined}
        className={cx(
          'btn btn-secondary mt-5 w-full gap-3',
          FOCUS_RING,
          pending && 'cursor-progress',
        )}
      >
        {pending ? <Spinner /> : <GoogleMark />}
        Continue with Google
      </button>
      {failed ? (
        <AuthAlert className="mt-3">
          Google sign-in isn’t available right now. Use an email code instead.
        </AuthAlert>
      ) : null}
    </div>
  );
}
