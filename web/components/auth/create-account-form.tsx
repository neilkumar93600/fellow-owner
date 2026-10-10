'use client';

import { LIMITS } from '@fellow-owners/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { type ChangeEvent, type FocusEvent, useEffect, useRef, useState } from 'react';
import { Controller, type FieldErrors, useForm, useWatch } from 'react-hook-form';
import { authClient, OTP_EMAIL_KEY } from '@/lib/auth-client';
import { clearAuthHint } from '@/lib/local-state';
import { FIELD_PAIR } from './auth-classes';
import { type AuthFailure, formatWait, isRetryable, runAuth } from './auth-errors';
import { AuthField, AuthPasswordField } from './auth-field';
import { AuthLegal } from './auth-legal';
import { withReturnTo } from './auth-return-to';
import {
  type CreateAccountFormInput,
  type CreateAccountFormValues,
  createAccountFormSchema,
} from './auth-schemas';
import { OTP_SENT_AT_KEY, writeSession } from './auth-storage';
import { AuthAlert, AuthCard, AuthHeading, OrDivider, SubmitButton } from './auth-ui';
import type { AuthFormProps } from './login-form';
import { PasswordStrength } from './password-strength';
import { holdPendingLogin } from './pending-login';
import { OAuthErrorAlert, SocialButtons } from './social-buttons';
import { SocialProfileField } from './social-profile-field';
import { normalizeUsernameInput, UsernameField, useUsernameStatus } from './username-field';

/** Reading order, for focusing the first field that needs fixing. */
const FIELD_ORDER = [
  'name',
  'email',
  'username',
  'socialHandle',
  'password',
  'confirmPassword',
] as const;

/**
 * /create-account: Google, Apple or Facebook, or a display name, email, handle (the page link and the
 * sign-in name, spec §11), optional social profile and a password typed twice. A new email account gets a 6‑digit code before its first session, so success
 * moves on to /verify-otp. An address that already has an account gets the same answer and no code,
 * so this screen cannot be used to learn who has signed up.
 */
export function CreateAccountForm({
  returnTo,
  inAppBrowser,
  oauthError,
  initialHandle = null,
}: AuthFormProps & {
  /** From ?handle= (the hero's claim bar via /start): pre-fills the Handle field, normalised as if typed. */
  initialHandle?: string | null;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<AuthFailure | null>(null);
  const [attempt, setAttempt] = useState(0);
  const inFlight = useRef(false);
  const oauthAlertRef = useRef<HTMLDivElement>(null);
  const hasOAuthError = Boolean(oauthError);
  const prefilledHandle = normalizeUsernameInput(initialHandle ?? '').slice(0, LIMITS.username.max);
  const {
    register,
    handleSubmit,
    control,
    setError,
    setFocus,
    setValue,
    trigger,
    getFieldState,
    formState: { errors, isSubmitted, touchedFields },
  } = useForm<CreateAccountFormInput, unknown, CreateAccountFormValues>({
    resolver: zodResolver(createAccountFormSchema),
    defaultValues: {
      name: '',
      email: '',
      username: prefilledHandle,
      socialPlatform: 'instagram',
      socialHandle: '',
      password: '',
      confirmPassword: '',
    },
    // Empty fields speak up on submit; a filled field is checked when left (checkWhenFilled), then
    // live while it shows an error (recheck), and live everywhere once the form has been submitted.
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    // Focus is handled below, in reading order.
    shouldFocusError: false,
  });
  const username = useWatch({ control, name: 'username' }) ?? '';
  const password = useWatch({ control, name: 'password' }) ?? '';
  const { status: usernameStatus, suggestions, markTaken, isTaken } = useUsernameStatus(username);
  const confirmTouched = Boolean(touchedFields.confirmPassword);

  // A changed password re-checks the confirmation, once that field has been visited.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `password` is the trigger, not an input.
  useEffect(() => {
    if (isSubmitted || confirmTouched) void trigger('confirmPassword');
  }, [password, isSubmitted, confirmTouched, trigger]);

  // The server only renders this page for a signed-out visitor, so any stale "signed in" hint goes.
  // A pre-filled handle is checked like a typed one (format here, availability in useUsernameStatus).
  // biome-ignore lint/correctness/useExhaustiveDependencies: once on arrival.
  useEffect(() => {
    clearAuthHint();
    if (prefilledHandle) void trigger('username');
  }, []);

  // Back from Google, Apple or Facebook with an error: read that first. Otherwise focus the first field
  // for mouse and keyboard users; on phones the keyboard would cover the page.
  useEffect(() => {
    if (hasOAuthError) oauthAlertRef.current?.focus();
    else if (window.matchMedia('(pointer: fine)').matches) setFocus('name');
  }, [setFocus, hasOAuthError]);

  /**
   * Checks a field when it is left, but only once something is in it: the name field starts focused,
   * and moving past an empty field is not a mistake yet. Empty required fields speak up on submit.
   */
  function checkWhenFilled(event: FocusEvent<HTMLInputElement>) {
    const field = event.target.name as keyof CreateAccountFormInput;
    if (event.target.value) void trigger(field);
  }

  /** A field showing an error is checked as it is fixed, so the message clears once it is right. */
  function recheck(event: ChangeEvent<HTMLInputElement>) {
    const field = event.target.name as keyof CreateAccountFormInput;
    // After a submit, reValidateMode already does this.
    if (!isSubmitted && getFieldState(field).invalid) void trigger(field);
  }

  /** The message renders first, then focus lands, so the field is read out with its error. */
  function showTaken() {
    setError('username', { message: 'That handle is taken. Try another.' });
    requestAnimationFrame(() => setFocus('username'));
  }

  function focusFirst(invalid: FieldErrors<CreateAccountFormInput>) {
    const first = FIELD_ORDER.find((name) => invalid[name]);
    if (first) setFocus(first);
  }

  const onSubmit = handleSubmit(async (values) => {
    if (inFlight.current) return;
    if (isTaken(values.username)) {
      showTaken();
      return;
    }
    inFlight.current = true;
    // An earlier failure stays up during the attempt, so its Retry keeps focus and shows the spinner.
    setPending(true);
    const result = await runAuth((fetchOptions) =>
      authClient.signUp.email({
        name: values.name,
        email: values.email,
        password: values.password,
        username: values.username,
        // Sent only as a pair: a platform with no handle says nothing.
        ...(values.socialHandle
          ? { socialPlatform: values.socialPlatform, socialHandle: values.socialHandle }
          : {}),
        fetchOptions,
      }),
    );

    if (result.ok) {
      setFailure(null);
      writeSession(OTP_EMAIL_KEY, values.email);
      writeSession(OTP_SENT_AT_KEY, String(Date.now()));
      // In memory only: /verify-otp logs in with it once the code is accepted.
      holdPendingLogin(values.email, values.password);
      // Stay busy while the code screen loads, so the button cannot be pressed twice.
      router.push(withReturnTo('/verify-otp', returnTo));
      return;
    }

    inFlight.current = false;
    setPending(false);
    const { failure: f } = result;
    // Field-level answers replace the alert; the rest keep one.
    setFailure(null);
    switch (f.kind) {
      case 'username_taken':
        markTaken(values.username);
        showTaken();
        return;
      case 'invalid_username':
        setError(
          'username',
          {
            message: `That handle can’t be used. Pick another: ${LIMITS.username.min} to ${LIMITS.username.max} lowercase letters, numbers, underscores or periods.`,
          },
          { shouldFocus: true },
        );
        return;
      case 'invalid_email':
        setError('email', { message: 'Enter a valid email' }, { shouldFocus: true });
        return;
      case 'password_too_short':
        setError(
          'password',
          { message: `Use at least ${LIMITS.password.min} characters` },
          { shouldFocus: true },
        );
        return;
      case 'password_too_long':
        setError(
          'password',
          { message: `Use ${LIMITS.password.max} characters or fewer` },
          { shouldFocus: true },
        );
        return;
      default:
        setFailure(f);
        setAttempt((n) => n + 1);
    }
  }, focusFirst);

  return (
    <AuthCard size="tall">
      <AuthHeading title="Create your account">
        Join a creator’s space, start your own, or both. One account does it all.
      </AuthHeading>

      {oauthError ? (
        <OAuthErrorAlert ref={oauthAlertRef} error={oauthError} className="mt-6" />
      ) : null}

      <SocialButtons
        page="/create-account"
        returnTo={returnTo}
        initialInApp={inAppBrowser}
        className="mt-5 short:mt-4"
      />
      {/* A social sign-up never reaches the line by the button below, so it is said here too. */}
      <OrDivider text="or sign up with email" className="mt-5 short:mt-3" />

      {/* method="post": a submit before hydration must never put the password in the URL. Name and
          email share a line once the form is 24rem wide (phones stack them); top-aligned, so an error
          under one never stretches the other. */}
      <form
        noValidate
        method="post"
        onSubmit={onSubmit}
        className="@container mt-5 flex flex-col gap-4 short:mt-3 short:gap-3"
        aria-label="Create an account with email"
      >
        <div className={FIELD_PAIR}>
          <AuthField
            id="name"
            label="Display name"
            hint="Shown on your page. You can change it later."
            type="text"
            autoComplete="name"
            autoCapitalize="words"
            maxLength={LIMITS.membership.name.max + 20}
            placeholder="Mira Lane"
            error={errors.name?.message}
            {...register('name', { onBlur: checkWhenFilled, onChange: recheck })}
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
            error={errors.email?.message}
            {...register('email', { onBlur: checkWhenFilled, onChange: recheck })}
          />
        </div>
        <UsernameField
          registration={register('username', { onBlur: checkWhenFilled, onChange: recheck })}
          status={usernameStatus}
          suggestions={suggestions}
          onPick={(picked) => {
            setValue('username', picked, { shouldValidate: true });
            setFocus('username');
          }}
          error={errors.username?.message}
        />
        <Controller
          control={control}
          name="socialPlatform"
          render={({ field }) => (
            <SocialProfileField
              platform={field}
              handle={register('socialHandle', { onBlur: checkWhenFilled, onChange: recheck })}
              error={errors.socialHandle?.message}
            />
          )}
        />
        <AuthPasswordField
          id="password"
          label="Password"
          autoComplete="new-password"
          error={errors.password?.message}
          hint={<PasswordStrength password={password} />}
          {...register('password', { onBlur: checkWhenFilled, onChange: recheck })}
        />
        <AuthPasswordField
          id="confirmPassword"
          label="Confirm password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword', { onBlur: checkWhenFilled, onChange: recheck })}
        />

        <AuthLegal />

        <div>
          <SubmitButton pending={pending}>Create account</SubmitButton>
          {failure ? (
            <AuthAlert
              className="mt-3"
              onRetry={isRetryable(failure) ? () => void onSubmit() : undefined}
              retrying={pending}
              attempt={attempt}
            >
              {createMessage(failure)}
            </AuthAlert>
          ) : null}
        </div>
      </form>
    </AuthCard>
  );
}

function createMessage(failure: AuthFailure): string {
  switch (failure.kind) {
    case 'rate_limited':
      return failure.retryAfterSeconds
        ? `Too many tries in a row. Try again in ${formatWait(failure.retryAfterSeconds)}.`
        : 'Too many tries in a row. Wait a minute, then try again.';
    case 'user_exists':
      return 'That email can’t start a new account. Log in instead, or reset your password.';
    case 'rejected':
      return failure.message ?? 'Something in the form needs another look. Check it and try again.';
    default:
      return 'We couldn’t reach Fellow Owners. Check your connection and try again.';
  }
}
