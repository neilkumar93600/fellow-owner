'use client';

import { parseLoginIdentifier } from '@fellow-owners/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { DemoButton } from '@/components/landing/demo-button';
import { authClient, OTP_EMAIL_KEY } from '@/lib/auth-client';
import { clearAuthHint, setAuthHint } from '@/lib/local-state';
import { getQueryClient } from '@/lib/query-client';
import { cx, LINK_HIT_AREA, TEXT_LINK } from './auth-classes';
import { type AuthFailure, formatWait, isRetryable, runAuth } from './auth-errors';
import { AuthField, AuthPasswordField } from './auth-field';
import { AuthLegal } from './auth-legal';
import { DEFAULT_DESTINATION, withReturnTo } from './auth-return-to';
import { type LoginFormValues, loginFormSchema } from './auth-schemas';
import type { OAuthError } from './auth-server';
import { OTP_SENT_AT_KEY, RESET_EMAIL_KEY, readSession, writeSession } from './auth-storage';
import {
  ALERT_ACTION,
  AuthAlert,
  AuthCard,
  AuthHeading,
  FOCUS_RING,
  OrDivider,
  SubmitButton,
} from './auth-ui';
import { holdPendingLogin } from './pending-login';
import { OAuthErrorAlert, SocialButtons } from './social-buttons';

export interface AuthFormProps {
  returnTo: string | null;
  inAppBrowser: boolean;
  oauthError: OAuthError | null;
}

/**
 * /login: Google, Apple or Facebook first (most arrivals come from a creator's bio link on a phone),
 * then a handle or email with a password; the coral Log in stays the screen's one primary action.
 * A wrong pair never says which half was wrong, so the screen cannot be used to test addresses.
 */
export function LoginForm({ returnTo, inAppBrowser, oauthError }: AuthFormProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<AuthFailure | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [verifyHref, setVerifyHref] = useState<string | null>(null);
  const inFlight = useRef(false);
  const oauthAlertRef = useRef<HTMLDivElement>(null);
  const hasOAuthError = Boolean(oauthError);
  const {
    register,
    handleSubmit,
    setFocus,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { identifier: '', password: '' },
    // Both fields only need filling in, so they speak up on submit (never because focus moved on from
    // the field that starts focused), then clear as the person types.
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  // The server only renders this page for a signed-out visitor (it is also where sign-out lands), so
  // any stale "signed in" hint goes.
  useEffect(() => clearAuthHint(), []);

  // Back from /verify-otp: bring the address back so only the password needs typing.
  useEffect(() => {
    const saved = readSession(OTP_EMAIL_KEY);
    if (saved && !getValues('identifier')) setValue('identifier', saved);
    // Back from Google, Apple or Facebook with an error: read that first. Otherwise focus the field for
    // mouse and keyboard users; on phones the keyboard would cover the page.
    if (hasOAuthError) oauthAlertRef.current?.focus();
    else if (window.matchMedia('(pointer: fine)').matches) setFocus('identifier');
  }, [getValues, setValue, setFocus, hasOAuthError]);

  const onSubmit = handleSubmit(async ({ identifier, password }) => {
    if (inFlight.current) return;
    inFlight.current = true;
    // An earlier failure stays up during the attempt, so its Retry keeps focus and shows the spinner.
    setPending(true);
    const who = parseLoginIdentifier(identifier);
    const result = await runAuth((fetchOptions) =>
      who.kind === 'email'
        ? authClient.signIn.email({ email: who.email, password, rememberMe: true, fetchOptions })
        : authClient.signIn.username({
            username: who.username,
            password,
            rememberMe: true,
            fetchOptions,
          }),
    );

    if (result.ok) {
      setFailure(null);
      // The address carried in from /verify-otp has done its job.
      writeSession(OTP_EMAIL_KEY, null);
      // Nothing cached for an earlier account (an expired session in this tab) may show for this one.
      getQueryClient().clear();
      const destination = returnTo ?? DEFAULT_DESTINATION;
      // ponytail: UX hint only; the role is guessed from where they are headed (studio paths = creator).
      setAuthHint(/^\/(dashboard|onboarding|start)(\/|\?|$)/.test(destination) ? 'creator' : 'fan');
      // Stay busy while the next page loads, so the button cannot be pressed twice.
      router.replace(destination);
      return;
    }

    inFlight.current = false;
    setPending(false);
    if (result.failure.kind === 'email_not_verified') {
      // Better Auth has just emailed a new code (sendOnSignIn). With a username the code screen asks
      // which email it went to, and the sent time stops it from sending a second code.
      writeSession(OTP_EMAIL_KEY, who.kind === 'email' ? who.email : null);
      writeSession(OTP_SENT_AT_KEY, String(Date.now()));
      // In memory only: the code screen logs in with these once the code is accepted ("Enter code"
      // is a client-side link, so they survive the move).
      holdPendingLogin(identifier, password);
      setVerifyHref(withReturnTo('/verify-otp', returnTo));
    }
    setFailure(result.failure);
    setAttempt((n) => n + 1);
  });

  /** Carries a typed email to /forgot-password, so it only needs confirming there. */
  function rememberEmailForReset() {
    const who = parseLoginIdentifier(getValues('identifier') ?? '');
    if (who.kind === 'email') writeSession(RESET_EMAIL_KEY, who.email);
  }

  return (
    <AuthCard>
      <AuthHeading title="Welcome back">
        Log in to your space and the communities you’ve joined.
      </AuthHeading>

      {oauthError ? (
        <OAuthErrorAlert ref={oauthAlertRef} error={oauthError} className="mt-6" />
      ) : null}

      <SocialButtons
        page="/login"
        returnTo={returnTo}
        initialInApp={inAppBrowser}
        className="mt-6"
      />
      <OrDivider text="or log in with email" className="mt-5" />

      {/* method="post": a submit before hydration must never put the password in the URL. */}
      <form
        noValidate
        method="post"
        onSubmit={onSubmit}
        className="mt-5"
        aria-label="Log in with email"
      >
        <AuthField
          id="identifier"
          label="Handle or email"
          type="text"
          inputMode="email"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder="yourname or you@example.com"
          error={errors.identifier?.message}
          {...register('identifier')}
        />
        <AuthPasswordField
          id="password"
          label="Password"
          autoComplete="current-password"
          className="mt-4"
          labelAside={
            <Link
              href={withReturnTo('/forgot-password', returnTo)}
              onClick={rememberEmailForReset}
              className={cx(TEXT_LINK, LINK_HIT_AREA, 'text-small')}
            >
              Forgot password?
            </Link>
          }
          error={errors.password?.message}
          {...register('password')}
        />
        <SubmitButton pending={pending} className="mt-5">
          Log in
        </SubmitButton>
        {failure ? (
          <AuthAlert
            className="mt-3"
            action={
              failure.kind === 'email_not_verified' && verifyHref ? (
                <Link href={verifyHref} className={ALERT_ACTION}>
                  Enter code
                </Link>
              ) : undefined
            }
            onRetry={isRetryable(failure) ? () => void onSubmit() : undefined}
            retrying={pending}
            attempt={attempt}
          >
            {logInMessage(failure)}
          </AuthAlert>
        ) : null}
      </form>

      <AuthLegal className="mt-4" />

      <DemoRow className="mt-5 border-t border-line pt-5" />
    </AuthCard>
  );
}

function logInMessage(failure: AuthFailure): string {
  switch (failure.kind) {
    case 'email_not_verified':
      return 'Confirm your email first. We’ve sent a new code to your inbox.';
    case 'rate_limited':
      return failure.retryAfterSeconds
        ? `Too many tries in a row. Try again in ${formatWait(failure.retryAfterSeconds)}.`
        : 'Too many tries in a row. Wait a minute, then try again.';
    case 'network':
    case 'unavailable':
      return 'We couldn’t reach Fellow Owners. Check your connection and try again.';
    case 'invalid_credentials':
    case 'invalid_email':
    case 'invalid_username':
    case 'user_not_found':
      // Wrong pair, unknown account or a malformed address: one answer for all (no enumeration).
      return 'That handle or email and password don’t match. Try again, or reset your password.';
    default:
      // Refused for a reason that is not the visitor's (a blocked origin, an unexpected rule).
      return 'We couldn’t log you in right now. Try again in a moment.';
  }
}

/** "Just looking?" Judges and curious fans can skip the account entirely (F22). */
function DemoRow({ className }: { className?: string }) {
  const buttonClass = cx('h-11 min-w-0 flex-1 px-4', FOCUS_RING);
  return (
    <section aria-labelledby="demo-row-title" className={cx('flex flex-col gap-3', className)}>
      <h2 id="demo-row-title" className="text-small text-ink-muted">
        Just looking? Open the demo, no account needed.
      </h2>
      <div className="flex gap-3">
        <DemoButton as="creator" variant="secondary" className={buttonClass}>
          <span className="sr-only">Open the demo in the </span>Creator view
        </DemoButton>
        <DemoButton as="fan" variant="secondary" className={buttonClass}>
          <span className="sr-only">Open the demo in the </span>Fan view
        </DemoButton>
      </div>
    </section>
  );
}
