'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { authClient } from '@/lib/auth-client';
import { cx } from './auth-classes';
import { type AuthFailure, isRetryable, runAuth, sendCodeMessage } from './auth-errors';
import { AuthField } from './auth-field';
import { type LoginFormValues, loginFormSchema } from './auth-schemas';
import { RESET_EMAIL_KEY, RESET_SENT_AT_KEY, readSession, writeSession } from './auth-storage';
import { AuthAlert, AuthColumn, AuthHeading, FOCUS_RING, SubmitButton } from './auth-ui';

/**
 * /forgot-password (built, not linked: password sign-in is off by default, PRD Q8). Sends a 6-digit
 * reset code through Better Auth's email OTP plugin, then continues on /reset-password.
 */
export function ForgotPasswordForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<AuthFailure | null>(null);
  const inFlight = useRef(false);
  const {
    register,
    handleSubmit,
    setFocus,
    getValues,
    setValue,
    setError,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: '' },
  });

  useEffect(() => {
    const saved = readSession(RESET_EMAIL_KEY);
    if (saved && !getValues('email')) setValue('email', saved);
    if (window.matchMedia('(pointer: fine)').matches) setFocus('email');
  }, [getValues, setValue, setFocus]);

  const onSubmit = handleSubmit(async ({ email }) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    // An earlier failure stays up during the attempt, so its Retry keeps focus and shows the spinner.
    const result = await runAuth((fetchOptions) =>
      authClient.emailOtp.requestPasswordReset({ email, fetchOptions }),
    );
    if (!result.ok) {
      inFlight.current = false;
      setPending(false);
      if (result.failure.kind === 'invalid_email') {
        setFailure(null);
        setError('email', { message: 'Enter a valid email' }, { shouldFocus: true });
      } else {
        setFailure(result.failure);
      }
      return;
    }
    setFailure(null);
    writeSession(RESET_EMAIL_KEY, email);
    writeSession(RESET_SENT_AT_KEY, String(Date.now()));
    router.push('/reset-password');
  });

  return (
    <AuthColumn>
      <AuthHeading title="Reset your password">
        Enter the email on your account. We’ll send a 6-digit code to reset it.
      </AuthHeading>

      <form noValidate onSubmit={onSubmit} className="mt-8" aria-label="Request a reset code">
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
        {failure ? (
          <AuthAlert
            className="mt-3"
            onRetry={isRetryable(failure) ? () => void onSubmit() : undefined}
            retrying={pending}
          >
            {sendCodeMessage(failure)}
          </AuthAlert>
        ) : null}
      </form>

      <BackToSignIn className="mt-8" />
    </AuthColumn>
  );
}

export function BackToSignIn({ className }: { className?: string }) {
  return (
    <p className={cx('text-center', className)}>
      <Link
        href="/login"
        className={cx(
          'inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-body font-medium text-ink',
          'transition-colors duration-150 hover:bg-page',
          FOCUS_RING,
        )}
      >
        <ArrowLeft aria-hidden size={16} strokeWidth={1.5} />
        Back to sign in
      </Link>
    </p>
  );
}
