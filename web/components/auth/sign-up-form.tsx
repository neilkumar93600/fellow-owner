'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { OTP_EMAIL_KEY, SIGNUP_NAME_KEY } from '@/lib/auth-client';
import { cx, LINK_HIT_AREA } from './auth-classes';
import { isRetryable, sendCodeMessage } from './auth-errors';
import { AuthField } from './auth-field';
import { withReturnTo } from './auth-return-to';
import { type SignUpFormValues, signUpFormSchema } from './auth-schemas';
import { useSendCode } from './auth-send-code';
import { readSession } from './auth-storage';
import { AuthAlert, AuthColumn, AuthHeading, SubmitButton, TEXT_LINK } from './auth-ui';
import { GoogleButton } from './google-button';
import type { AuthFormProps } from './login-form';

/** /sign-up: name and email, then the same 6-digit code step as sign in. */
export function SignUpForm({ returnTo, inAppBrowser }: AuthFormProps) {
  const { send, pending, failure } = useSendCode({ returnTo });
  const {
    register,
    handleSubmit,
    setError,
    setFocus,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpFormSchema),
    defaultValues: { name: '', email: '' },
  });

  // Back from /verify-otp ("Change"): restore what was typed.
  useEffect(() => {
    const savedName = readSession(SIGNUP_NAME_KEY);
    const savedEmail = readSession(OTP_EMAIL_KEY);
    if (savedName && !getValues('name')) setValue('name', savedName);
    if (savedEmail && !getValues('email')) setValue('email', savedEmail);
    if (window.matchMedia('(pointer: fine)').matches) setFocus('name');
  }, [getValues, setValue, setFocus]);

  useEffect(() => {
    if (failure?.kind === 'invalid_email') {
      setError('email', { message: 'Enter a valid email' }, { shouldFocus: true });
    }
  }, [failure, setError]);

  const onSubmit = handleSubmit(({ name, email }) => send({ name, email }));
  const showAlert = failure && failure.kind !== 'invalid_email';

  return (
    <AuthColumn>
      <AuthHeading title="Create your account">
        Your name and email. We’ll send a 6-digit code to confirm it’s you.
      </AuthHeading>

      <form noValidate onSubmit={onSubmit} className="mt-8" aria-label="Create your account">
        <AuthField
          id="name"
          label="Your name"
          type="text"
          autoComplete="name"
          autoCapitalize="words"
          enterKeyHint="next"
          error={errors.name?.message}
          {...register('name')}
        />
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
          className="mt-5"
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
        Already have an account?{' '}
        <Link href={withReturnTo('/login', returnTo)} className={cx(TEXT_LINK, LINK_HIT_AREA)}>
          Sign in
        </Link>
      </p>
    </AuthColumn>
  );
}
