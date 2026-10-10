'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { authClient } from '@/lib/auth-client';
import { type AuthFailure, isRetryable, runAuth, sendCodeMessage } from './auth-errors';
import { AuthField } from './auth-field';
import { withReturnTo } from './auth-return-to';
import { type EmailFormValues, emailFormSchema } from './auth-schemas';
import { RESET_EMAIL_KEY, RESET_SENT_AT_KEY, readSession, writeSession } from './auth-storage';
import { AuthAlert, AuthCard, AuthHeading, SubmitButton } from './auth-ui';

/**
 * /forgot-password, linked from the Password label on /login. Sends a 6‑digit reset code through
 * Better Auth's email OTP plugin, then continues on /reset-password. The answer is the same whether or
 * not the address has an account, so the screen cannot be used to test addresses.
 */
export function ForgotPasswordForm({ returnTo }: { returnTo: string | null }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<AuthFailure | null>(null);
  const [attempt, setAttempt] = useState(0);
  const inFlight = useRef(false);
  const {
    register,
    handleSubmit,
    setFocus,
    getValues,
    setValue,
    setError,
    formState: { errors },
  } = useForm<EmailFormValues>({
    resolver: zodResolver(emailFormSchema),
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
        setAttempt((n) => n + 1);
      }
      return;
    }
    setFailure(null);
    writeSession(RESET_EMAIL_KEY, email);
    writeSession(RESET_SENT_AT_KEY, String(Date.now()));
    router.push(withReturnTo('/reset-password', returnTo));
  });

  return (
    <AuthCard size="short">
      <AuthHeading title="Reset your password">
        Enter the email on your account. We’ll send you a 6‑digit code.
      </AuthHeading>

      <form
        noValidate
        method="post"
        onSubmit={onSubmit}
        className="mt-8"
        aria-label="Request a reset code"
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
        <SubmitButton pending={pending} className="mt-6">
          Send reset code
        </SubmitButton>
        {failure ? (
          <AuthAlert
            className="mt-3"
            onRetry={isRetryable(failure) ? () => void onSubmit() : undefined}
            retrying={pending}
            attempt={attempt}
          >
            {sendCodeMessage(failure)}
          </AuthAlert>
        ) : null}
      </form>
    </AuthCard>
  );
}
