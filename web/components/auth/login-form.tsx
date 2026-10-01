'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { DemoButton } from '@/components/landing/demo-button';
import { OTP_EMAIL_KEY } from '@/lib/auth-client';
import { cx, LINK_HIT_AREA } from './auth-classes';
import { isRetryable, sendCodeMessage } from './auth-errors';
import { AuthField } from './auth-field';
import { withReturnTo } from './auth-return-to';
import { type LoginFormValues, loginFormSchema } from './auth-schemas';
import { useSendCode } from './auth-send-code';
import { readSession } from './auth-storage';
import { AuthAlert, AuthColumn, AuthHeading, FOCUS_RING, SubmitButton, TEXT_LINK } from './auth-ui';
import { GoogleButton } from './google-button';

export interface AuthFormProps {
  returnTo: string | null;
  inAppBrowser: boolean;
}

/** /login: email, then a 6-digit code. Google outside in-app browsers. A quiet way into the demo. */
export function LoginForm({
  returnTo,
  inAppBrowser,
  oauthError = false,
}: AuthFormProps & { oauthError?: boolean }) {
  const { send, pending, failure } = useSendCode({ returnTo });
  const {
    register,
    handleSubmit,
    setError,
    setFocus,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: '' },
  });

  // Back from /verify-otp ("Change"): bring the address back so only the typo needs fixing.
  useEffect(() => {
    const saved = readSession(OTP_EMAIL_KEY);
    if (saved && !getValues('email')) setValue('email', saved);
    // Focus the field for mouse and keyboard users; on phones the keyboard would cover the page.
    if (window.matchMedia('(pointer: fine)').matches) setFocus('email');
  }, [getValues, setValue, setFocus]);

  useEffect(() => {
    if (failure?.kind === 'invalid_email') {
      setError('email', { message: 'Enter a valid email' }, { shouldFocus: true });
    }
  }, [failure, setError]);

  const onSubmit = handleSubmit(({ email }) => send({ email }));
  const showAlert = failure && failure.kind !== 'invalid_email';

  return (
    <AuthColumn>
      <AuthHeading title="Sign in">We’ll email you a 6-digit code. No password needed.</AuthHeading>

      {oauthError ? (
        <AuthAlert className="mt-6">
          Google sign-in didn’t finish. Try again, or use an email code.
        </AuthAlert>
      ) : null}

      <form
        noValidate
        onSubmit={onSubmit}
        className="mt-8 [@media(max-height:760px)]:mt-6"
        aria-label="Sign in with an email code"
      >
        <AuthField
          id="email"
          label="Email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register('email')}
        />
        <SubmitButton pending={pending} className="mt-5">
          Email me a code
        </SubmitButton>
        {showAlert ? (
          <AuthAlert
            className="mt-3"
            onRetry={isRetryable(failure) ? () => void onSubmit() : undefined}
            retrying={pending}
          >
            {sendCodeMessage(failure)}
          </AuthAlert>
        ) : null}
      </form>

      <GoogleButton returnTo={returnTo} initialInApp={inAppBrowser} className="mt-5" />

      <p className="mt-6 text-center text-body text-ink-muted">
        New here?{' '}
        <Link href={withReturnTo('/sign-up', returnTo)} className={cx(TEXT_LINK, LINK_HIT_AREA)}>
          Create an account
        </Link>
      </p>

      <DemoRow className="mt-8 [@media(max-height:760px)]:mt-6" />
    </AuthColumn>
  );
}

/** "Just looking?" Judges and curious fans can skip the email entirely (F22). */
function DemoRow({ className }: { className?: string }) {
  const buttonClass = cx('h-11 min-w-0 flex-1 px-4', FOCUS_RING);
  return (
    <section
      aria-labelledby="demo-row-title"
      className={cx(
        'flex flex-col gap-3 border-t border-line pt-6 [@media(max-height:760px)]:pt-5',
        className,
      )}
    >
      <h2 id="demo-row-title" className="text-small text-ink-muted">
        Just looking? Enter the demo, no email needed.
      </h2>
      <div className="flex gap-3">
        <DemoButton as="creator" variant="secondary" className={buttonClass}>
          <span className="sr-only">Enter the demo </span>As creator
        </DemoButton>
        <DemoButton as="fan" variant="secondary" className={buttonClass}>
          <span className="sr-only">Enter the demo </span>As fan
        </DemoButton>
      </div>
    </section>
  );
}
