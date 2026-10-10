'use client';

import { LIMITS, otpCodeSchema, passwordSchema } from '@fellow-owners/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { Check } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { authClient } from '@/lib/auth-client';

import { cx } from './auth-classes';
import { type AuthFailure, isRetryable, runAuth, sendCodeMessage } from './auth-errors';
import { AuthField, AuthPasswordField } from './auth-field';
import { EMPTY_CODE, OtpInput, type OtpInputHandle } from './auth-otp-input';
import { ResendCode } from './auth-resend';
import { withReturnTo } from './auth-return-to';
import { requiredEmail } from './auth-schemas';
import {
  RESET_EMAIL_KEY,
  RESET_SENT_AT_KEY,
  readSession,
  useSecondsUntil,
  useSessionValue,
  writeSession,
} from './auth-storage';
import {
  AuthAlert,
  AuthCard,
  AuthHeading,
  FieldMessage,
  FOCUS_RING,
  SubmitButton,
} from './auth-ui';
import { PasswordStrength } from './password-strength';

const PASSWORD_MIN = LIMITS.password.min;
const PASSWORD_MAX = LIMITS.password.max;

const resetSchema = z
  .object({
    email: requiredEmail,
    otp: otpCodeSchema,
    password: z.string().min(1, 'Choose a new password').pipe(passwordSchema),
    confirmPassword: z.string().min(1, 'Type your new password again'),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords don’t match',
    when: (payload) => {
      const value = payload.value as { password?: unknown; confirmPassword?: unknown };
      return (
        typeof value.password === 'string' &&
        typeof value.confirmPassword === 'string' &&
        value.confirmPassword !== ''
      );
    },
  });
type ResetValues = z.input<typeof resetSchema>;

const RESEND_AFTER_MS = LIMITS.otp.resendAfterSeconds * 1000;

/**
 * /reset-password. Email (prefilled from /forgot-password), the 6‑digit code and a new password typed
 * twice, with a show toggle and a strength hint, then a success state that points back to log in.
 */
export function ResetPasswordForm({ returnTo }: { returnTo: string | null }) {
  const headingRef = useRef<HTMLDivElement>(null);
  const otpRef = useRef<OtpInputHandle>(null);
  const codeLabelId = useId();
  const codeHintId = useId();
  const inFlight = useRef(false);

  const [digits, setDigits] = useState<string[]>([...EMPTY_CODE]);
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<AuthFailure | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [done, setDone] = useState(false);
  const [resendPending, setResendPending] = useState(false);
  const [resendFailure, setResendFailure] = useState<AuthFailure | null>(null);
  const [resendAttempt, setResendAttempt] = useState(0);

  const sentAtRaw = useSessionValue(RESET_SENT_AT_KEY);
  const sentAt = sentAtRaw ? Number(sentAtRaw) : Number.NaN;
  const secondsLeft = useSecondsUntil(Number.isFinite(sentAt) ? sentAt + RESEND_AFTER_MS : null);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    getValues,
    setError,
    clearErrors,
    setFocus,
    trigger,
    formState: { errors, isSubmitted, touchedFields },
  } = useForm<ResetValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { email: '', otp: '', password: '', confirmPassword: '' },
    // Focus is handled below so the code boxes (no DOM ref) take their turn in reading order.
    shouldFocusError: false,
  });
  const password = useWatch({ control, name: 'password' }) ?? '';
  const confirmTouched = Boolean(touchedFields.confirmPassword);

  // A changed password re-checks the confirmation, once that field has been visited.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `password` is the trigger, not an input.
  useEffect(() => {
    if (isSubmitted || confirmTouched) void trigger('confirmPassword');
  }, [password, isSubmitted, confirmTouched, trigger]);

  // Focus the first field still to fill: the code when the email came from /forgot-password, the email
  // on a direct visit. Only for mouse and keyboard users; on phones the keyboard would cover the page.
  useEffect(() => {
    const saved = readSession(RESET_EMAIL_KEY);
    if (saved && !getValues('email')) setValue('email', saved);
    if (!window.matchMedia('(pointer: fine)').matches) return;
    if (getValues('email')) otpRef.current?.focus(0);
    else setFocus('email');
  }, [getValues, setValue, setFocus]);

  useEffect(() => {
    if (done) headingRef.current?.focus();
  }, [done]);

  // The code boxes are a custom control: register the value without a DOM ref.
  useEffect(() => {
    register('otp');
  }, [register]);

  function onDigits(next: string[]) {
    setDigits(next);
    setValue('otp', next.join(''), { shouldValidate: isSubmitted });
    if (errors.otp) clearErrors('otp');
  }

  const onSubmit = handleSubmit(
    async ({ email, otp, password: newPassword }) => {
      if (inFlight.current) return;
      inFlight.current = true;
      // An earlier failure stays up during the attempt, so its Retry keeps focus and shows the spinner.
      setPending(true);
      const result = await runAuth((fetchOptions) =>
        authClient.emailOtp.resetPassword({ email, otp, password: newPassword, fetchOptions }),
      );
      inFlight.current = false;
      setPending(false);

      if (result.ok) {
        writeSession(RESET_EMAIL_KEY, null);
        writeSession(RESET_SENT_AT_KEY, null);
        setDone(true);
        return;
      }

      const { failure: f } = result;
      // Field-level answers replace the alert; only the default case below keeps one.
      setFailure(null);
      switch (f.kind) {
        case 'invalid_otp':
        case 'user_not_found':
          setError('otp', { message: 'That code didn’t match. Check the email and try again.' });
          otpRef.current?.focus(0);
          return;
        case 'otp_expired':
          setError('otp', { message: 'This code expired. Send a new one below.' });
          return;
        case 'too_many_attempts':
          setError('otp', { message: 'Too many tries for this code. Send a new one below.' });
          return;
        case 'password_too_short':
          setError(
            'password',
            { message: `Use at least ${PASSWORD_MIN} characters` },
            { shouldFocus: true },
          );
          return;
        case 'password_too_long':
          setError(
            'password',
            { message: `Use ${PASSWORD_MAX} characters or fewer` },
            { shouldFocus: true },
          );
          return;
        case 'invalid_email':
          setError('email', { message: 'Enter a valid email' }, { shouldFocus: true });
          return;
        default:
          setFailure(f);
          setAttempt((n) => n + 1);
      }
    },
    // First invalid field in reading order gets focus (React Hook Form cannot focus the code boxes).
    (invalid) => {
      if (invalid.email) setFocus('email');
      else if (invalid.otp) otpRef.current?.focus();
      else if (invalid.password) setFocus('password');
      else if (invalid.confirmPassword) setFocus('confirmPassword');
    },
  );

  async function resend() {
    const valid = await trigger('email');
    if (!valid || resendPending || secondsLeft > 0) return;
    const email = getValues('email').trim().toLowerCase();
    setResendPending(true);
    const result = await runAuth((fetchOptions) =>
      authClient.emailOtp.requestPasswordReset({ email, fetchOptions }),
    );
    setResendPending(false);
    if (!result.ok) {
      setResendFailure(result.failure);
      setResendAttempt((n) => n + 1);
      return;
    }
    setResendFailure(null);
    writeSession(RESET_EMAIL_KEY, email);
    writeSession(RESET_SENT_AT_KEY, String(Date.now()));
    clearErrors('otp');
    onDigits([...EMPTY_CODE]);
    toast.success('New code sent', { description: `Check ${email}. It expires in 10 minutes.` });
    otpRef.current?.focus(0);
  }

  if (done) {
    return (
      <AuthCard size="short">
        <span className="mx-auto mb-6 grid size-14 place-items-center rounded-md bg-aqua-tile text-info-ink">
          <Check aria-hidden size={24} strokeWidth={1.5} />
        </span>
        <AuthHeading title="Password updated" headingRef={headingRef}>
          Your new password is saved. Log in to pick up where you left off.
        </AuthHeading>
        <Link
          href={withReturnTo('/login', returnTo)}
          className={cx('btn btn-primary mt-8 w-full', FOCUS_RING)}
        >
          Log in
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard>
      <AuthHeading title="Choose a new password">
        Enter the code from your email, then choose a new password.
      </AuthHeading>

      {/* method="post": a submit before hydration must never put the password in the URL. */}
      <form
        noValidate
        method="post"
        onSubmit={onSubmit}
        className="mt-6"
        aria-label="Choose a new password"
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

        <p id={codeLabelId} className="mt-4 text-small font-medium text-ink">
          6‑digit code
        </p>
        <div className="mt-1.5">
          <OtpInput
            id="otp"
            ref={otpRef}
            value={digits}
            onChange={onDigits}
            labelledBy={codeLabelId}
            describedBy={codeHintId}
            inputDescribedBy="otp-error"
            invalid={Boolean(errors.otp)}
            readOnly={pending}
          />
        </div>
        <FieldMessage id="otp-error" message={errors.otp?.message} />
        <p id={codeHintId} className="mt-1.5 text-small text-ink-muted">
          Check spam if it’s not in your inbox.
        </p>

        <AuthPasswordField
          id="password"
          label="New password"
          autoComplete="new-password"
          className="mt-4"
          error={errors.password?.message}
          hint={<PasswordStrength password={password} />}
          {...register('password')}
        />
        <AuthPasswordField
          id="confirmPassword"
          label="Confirm new password"
          autoComplete="new-password"
          className="mt-4"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        <SubmitButton pending={pending} className="mt-5">
          Save new password
        </SubmitButton>
        {failure ? (
          <AuthAlert
            className="mt-3"
            onRetry={isRetryable(failure) ? () => void onSubmit() : undefined}
            retrying={pending}
            attempt={attempt}
          >
            {failure.kind === 'rate_limited'
              ? 'Too many tries in a row. Wait a minute, then try again.'
              : failure.kind === 'rejected' && failure.message
                ? failure.message
                : 'We couldn’t save your new password right now. Try again.'}
          </AuthAlert>
        ) : null}
        {resendFailure ? (
          <AuthAlert
            className="mt-3"
            onRetry={isRetryable(resendFailure) ? () => void resend() : undefined}
            retrying={resendPending}
            attempt={resendAttempt}
          >
            {sendCodeMessage(resendFailure)}
          </AuthAlert>
        ) : null}
      </form>

      <ResendCode
        className="mt-5"
        secondsLeft={secondsLeft}
        pending={resendPending}
        onResend={() => void resend()}
      />
    </AuthCard>
  );
}
