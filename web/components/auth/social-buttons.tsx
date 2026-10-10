'use client';

import { Info } from 'lucide-react';
import type * as React from 'react';
import { useEffect, useState } from 'react';
import { usePublicConfig } from '@/hooks/queries/use-public-config';
import { useInAppBrowser } from '@/hooks/use-in-app-browser';
import { authClient } from '@/lib/auth-client';
import { cx } from './auth-classes';
import { runAuth } from './auth-errors';
import { DEFAULT_DESTINATION, withReturnTo } from './auth-return-to';
import type { OAuthError, SocialProvider } from './auth-server';
import { AuthAlert, FOCUS_RING, Spinner } from './auth-ui';

const LABELS: Record<SocialProvider, string> = {
  google: 'Google',
  apple: 'Apple',
  facebook: 'Facebook',
};

/** Official marks (lucide has no brand icons). Decorative: the button's text names the provider. */
function GoogleMark() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 512 512">
      <path d="M0 0h512v512H0z" fill="none" />
      <path
        fill="#fc4c53"
        d="M502.2 209.5H261.1v99.1h137.8c-6.1 31.9-24.2 58.9-51.4 77c-22.8 15.4-51.9 24.7-86.3 24.7c-66.6 0-123.1-44.9-143.4-105.4h-.3l.3-.2c-5.1-15.4-8.1-31.7-8.1-48.6s3-33.3 8.1-48.6C138 147 194.6 102.1 261.2 102.1c37.7 0 71.2 13 98 38.2L432.5 67C388 25.4 330.2 0 261.1 0C161 0 74.7 57.5 32.6 141.3C15.1 175.7 5.1 214.6 5.1 256s10 80.3 27.5 114.7v.2C74.7 454.5 161 512 261.1 512c69.1 0 127.1-22.8 169.4-61.9c48.4-44.7 76.3-110.3 76.3-188.3c.1-18.1-1.5-35.6-4.6-52.3"
      />
      <radialGradient
        id="SVGlCFn0bxH"
        cx="91.998"
        cy="254.653"
        r="224.709"
        gradientTransform="matrix(.8032 0 0 -1.0842 -7.184 568.69)"
        gradientUnits="userSpaceOnUse"
      >
        <stop offset=".368" stopColor="#ffcf09" />
        <stop offset=".718" stopColor="#ffcf09" stopOpacity=".7" />
        <stop offset="1" stopColor="#ffcf09" stopOpacity="0" />
      </radialGradient>
      <path
        fill="url(#SVGlCFn0bxH)"
        d="M117.8 304.9h-.3l.3-.2c-5.1-15.4-8.1-31.7-8.1-48.6c0-17 3-33.3 8.1-48.6c12.8-38.3 40.2-70.2 75.3-88.6C169 86.9 138.3 64 104 54.2c-29.7 23.3-54.3 52.9-71.5 87C15.1 175.7 5.1 214.6 5.1 256s10 80.3 27.5 114.7v.2c28.3 56 76.5 100.3 135.3 123.4c24.6-22.5 44.7-53 58.6-88.7c-50.9-12.4-92.1-51.1-108.7-100.7"
      />
      <radialGradient
        id="SVGPEcGceFK"
        cx="188.9"
        cy="-30.673"
        r="276.436"
        gradientTransform="matrix(1.317 -.1645 -.1248 -.9995 90.861 507.496)"
        gradientUnits="userSpaceOnUse"
      >
        <stop offset=".383" stopColor="#34a853" />
        <stop offset=".706" stopColor="#34a853" stopOpacity=".7" />
        <stop offset="1" stopColor="#34a853" stopOpacity="0" />
      </radialGradient>
      <path
        fill="url(#SVGPEcGceFK)"
        d="M34.5 374.4C77.2 456.1 162.4 512 261.1 512c69.1 0 127.1-22.8 169.4-61.9c48.4-44.7 76.3-110.3 76.3-188.3c0-4.5-.4-8.7-.6-13.1c-59-19.4-126.6-26.7-197.2-17.9c-16.4 2-32.2 5.1-47.8 8.7v69.1H399c-6.1 31.9-24.2 58.9-51.4 77c-22.8 15.4-51.9 24.7-86.3 24.7c-66.6 0-123.1-44.9-143.4-105.4h-.3l.3-.2c-.5-1.5-.7-3.1-1.2-4.6c-32.5 21.3-60.2 46.5-82.2 74.3"
      />
      <linearGradient
        id="SVGz1WGLcWS"
        x1="521.402"
        x2="255.847"
        y1="398.065"
        y2="71.945"
        gradientTransform="matrix(1 0 0 -1 0 514)"
        gradientUnits="userSpaceOnUse"
      >
        <stop offset=".671" stopColor="#4285f4" />
        <stop offset=".885" stopColor="#4285f4" stopOpacity="0" />
      </linearGradient>
      <path
        fill="url(#SVGz1WGLcWS)"
        d="M430.5 450.1c48.4-44.7 76.3-110.3 76.3-188.3c0-18.2-1.6-35.6-4.7-52.4h-241v99.1h137.8c-6.1 31.9-24.2 58.9-51.4 77c-16.4 11-36.1 18.8-58.6 22.3l85.7 79.7c20.8-9.7 39.6-22.3 55.9-37.4"
      />
    </svg>
  );
}

function AppleMark() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-5 shrink-0">
      <path
        fill="#000"
        d="M16.37 1.43c0 1.14-.5 2.27-1.18 3.08-.74.9-1.99 1.57-2.99 1.57-.12 0-.23-.02-.3-.03-.01-.06-.04-.22-.04-.39 0-1.15.57-2.27 1.2-2.98.81-.94 2.15-1.64 3.25-1.68.03.13.06.28.06.43zm4.56 15.71c-.03.07-.46 1.58-1.52 3.12-.94 1.34-1.94 2.71-3.43 2.71-1.52 0-1.9-.88-3.63-.88-1.7 0-2.3.91-3.67.91-1.38 0-2.33-1.26-3.43-2.8-1.29-1.82-2.32-4.63-2.32-7.28 0-4.28 2.8-6.55 5.55-6.55 1.45 0 2.67.95 3.6.95.86 0 2.22-1.01 3.9-1.01.61 0 2.89.06 4.37 2.19-.13.09-2.38 1.37-2.38 4.19 0 3.26 2.85 4.42 2.96 4.45z"
      />
    </svg>
  );
}

function FacebookMark() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-5 shrink-0">
      <path
        fill="#0866FF"
        d="M9.1 23.69v-7.98H6.63v-3.67H9.1v-1.58c0-4.09 1.85-5.98 5.86-5.98.4 0 .96.04 1.47.1.39.05.77.11 1.14.2v3.32c-.22-.02-.44-.03-.65-.04-.24 0-.49-.01-.73-.01-.71 0-1.26.1-1.68.31-.28.14-.51.36-.68.62-.26.42-.37 1-.37 1.75v1.3h3.92l-.39 2.1-.29 1.56h-3.25v8.25C19.4 23.24 24 18.18 24 12.04 24 5.42 18.63.04 12 .04S0 5.42 0 12.04c0 5.63 3.87 10.35 9.1 11.65z"
      />
    </svg>
  );
}

const COLUMNS = ['', 'grid-cols-1', 'grid-cols-2', 'grid-cols-3'];

const MARKS: Record<SocialProvider, () => React.JSX.Element> = {
  google: GoogleMark,
  apple: AppleMark,
  facebook: FacebookMark,
};

/**
 * Google, Apple and Facebook (Meta's login, standing in for Instagram, which has no consumer OAuth) as
 * three white pills. Each opens the provider's page; on success the client follows the redirect, so the
 * pressed button keeps its spinner until the page leaves. Inside in-app browsers (Instagram, TikTok,
 * YouTube, X and others) Google blocks OAuth, so its button is left out and a line says why. The server
 * passes its user agent check as `initialInApp`, so the right set renders from the first paint.
 *
 * The labels go visually hidden when the row is too narrow for three of them (container query): the
 * pills stay 48px tall and the accessible names stay whole. Providers this deployment has not
 * configured (GET /api/config) are left out; with none left the component renders nothing.
 */
export function SocialButtons({
  page,
  returnTo,
  initialInApp,
  className,
}: {
  /** The screen to come back to when the provider reports an error. */
  page: '/login' | '/create-account';
  returnTo: string | null;
  initialInApp: boolean;
  className?: string;
}) {
  const detected = useInAppBrowser();
  const inApp = detected ?? initialInApp;
  const [pending, setPending] = useState<SocialProvider | null>(null);
  const [failed, setFailed] = useState<SocialProvider | null>(null);
  // Until the config answers (or if it fails) every pill shows; then only the configured ones.
  const enabled = usePublicConfig().data?.providers;
  const providers = (
    inApp ? (['apple', 'facebook'] as const) : (['google', 'apple', 'facebook'] as const)
  ).filter((provider) => !enabled || enabled[provider]);
  const compact = providers.length < 3;
  const inAppNote = inApp && (!enabled || enabled.google);

  // Coming back from the provider with the browser's Back button restores this page from the bfcache.
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) setPending(null);
    };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, []);

  async function start(provider: SocialProvider) {
    if (pending) return;
    setPending(provider);
    setFailed(null);
    const result = await runAuth((fetchOptions) =>
      authClient.signIn.social({
        provider,
        callbackURL: returnTo ?? DEFAULT_DESTINATION,
        errorCallbackURL: withReturnTo(`${page}?via=${provider}`, returnTo),
        fetchOptions,
      }),
    );
    if (!result.ok) {
      setPending(null);
      setFailed(provider);
    }
  }

  if (providers.length === 0 && !inAppNote) return null;

  return (
    <div className={className}>
      <div className="@container">
        <div className={cx('grid gap-2 sm:gap-3', COLUMNS[providers.length])}>
          {providers.map((provider) => {
            const Mark = MARKS[provider];
            const busy = pending === provider;
            const blocked = pending !== null && !busy;
            return (
              <button
                key={provider}
                type="button"
                onClick={() => void start(provider)}
                aria-busy={busy || undefined}
                aria-disabled={blocked || undefined}
                className={cx(
                  'btn btn-secondary w-full min-w-0 gap-2 px-3',
                  FOCUS_RING,
                  busy && 'cursor-progress',
                )}
              >
                {busy ? (
                  <span className="grid size-5 shrink-0 place-items-center">
                    <Spinner />
                  </span>
                ) : (
                  <Mark />
                )}
                <span className="sr-only">Continue with </span>
                <span
                  className={
                    compact
                      ? 'sr-only @min-[15rem]:not-sr-only'
                      : 'sr-only @min-[22rem]:not-sr-only'
                  }
                >
                  {LABELS[provider]}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      {inAppNote ? (
        <p className="mt-3 flex items-start gap-2 text-small text-ink-muted">
          <Info aria-hidden size={16} strokeWidth={1.5} className="mt-px shrink-0" />
          <span>Google sign-in doesn’t work in this app’s browser.</span>
        </p>
      ) : null}
      {failed ? (
        <AuthAlert className="mt-3">
          {LABELS[failed]} sign-in isn’t available right now. Use your email instead.
        </AuthAlert>
      ) : null}
    </div>
  );
}

/** Provider codes for "the visitor said no": OAuth's access_denied, and Apple's own cancel. */
const CANCELLED = new Set(['access_denied', 'user_cancelled_authorize']);

/** What went wrong at the provider, from the `?error=` and `?via=` Better Auth sent the visitor back with. */
export function OAuthErrorAlert({
  error,
  className,
  ref,
}: {
  error: OAuthError;
  className?: string;
  ref?: React.Ref<HTMLDivElement>;
}) {
  const provider = error.provider ? LABELS[error.provider] : 'Social';
  const message =
    error.code === 'account_not_linked'
      ? 'There’s already an account with this email. Log in with your email and password instead.'
      : CANCELLED.has(error.code)
        ? `${provider} sign-in was cancelled.`
        : `${provider} sign-in didn’t finish. Try again, or use your email.`;
  return (
    <AuthAlert ref={ref} className={className}>
      {message}
    </AuthAlert>
  );
}
