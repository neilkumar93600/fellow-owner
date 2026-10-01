'use client';

import { LIMITS, otpCodeSchema } from '@fellow-owners/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { Check } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { authClient } from '@/lib/auth-client';

import styles from './auth.module.css';
import { cx } from './auth-classes';
import { type AuthFailure, isRetryable, runAuth, sendCodeMessage } from './auth-errors';
import { AuthField, AuthPasswordField } from './auth-field';
import { EMPTY_CODE, OtpInput, type OtpInputHandle } from './auth-otp-input';
import { ResendCode } from './auth-resend';
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
  AuthColumn,
  AuthHeading,
  FieldMessage,
  FOCUS_RING,
  SubmitButton,
} from './auth-ui';
import { BackToSignIn } from './forgot-password-form';

/** Better Auth's defaults (minPasswordLength 8, maxPasswordLength 128). */
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 128;

const resetSchema = z.object({
  email: requiredEmail,
  otp: otpCodeSchema,
  password: z
    .string()
    .min(PASSWORD_MIN, `Use at least ${PASSWORD_MIN} characters`)
    .max(PASSWORD_MAX, `Use ${PASSWORD_MAX} characters or fewer`),
});
type ResetValues = z.input<typeof resetSchema>;

const RESEND_AFTER_MS = LIMITS.otp.resendAfterSeconds * 1000;

/**
 * /reset-password (built, not linked). Email (prefilled from /forgot-password), the 6-digit code and a new
 * password with a show toggle and a strength hint, then a success state that points back to sign in.
 */
export function ResetPasswordForm() {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const otpRef = useRef<OtpInputHandle>(null);
  const codeLabelId = useId();
  const codeHintId = useId();
  const inFlight = useRef(false);

  const [digits, setDigits] = useState<string[]>([...EMPTY_CODE]);
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<AuthFailure | null>(null);
  const [done, setDone] = useState(false);
  const [resendPending, setResendPending] = useState(false);
  const [resendFailure, setResendFailure] = useState<AuthFailure | null>(null);

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
    formState: { errors, isSubmitted },
  } = useForm<ResetValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { email: '', otp: '', password: '' },
    // Focus is handled below so the code boxes (no DOM ref) take their turn in reading order.
    shouldFocusError: false,
  });
  const password = useWatch({ control, name: 'password' }) ?? '';

  useEffect(() => {
    const saved = readSession(RESET_EMAIL_KEY);
    if (saved && !getValues('email')) setValue('email', saved);
    if (window.matchMedia('(pointer: fine)').matches) otpRef.current?.focus(0);
  }, [getValues, setValue]);

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
      setPending(true);
      setFailure(null);
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
      }
    },
    // First invalid field in reading order gets focus (React Hook Form cannot focus the code boxes).
    (invalid) => {
      if (invalid.email) setFocus('email');
      else if (invalid.otp) otpRef.current?.focus();
      else if (invalid.password) setFocus('password');
    },
  );

  async function resend() {
    const valid = await trigger('email');
    if (!valid || resendPending || secondsLeft > 0) return;
    const email = getValues('email').trim().toLowerCase();
    setResendPending(true);
    setResendFailure(null);
    const result = await runAuth((fetchOptions) =>
      authClient.emailOtp.requestPasswordReset({ email, fetchOptions }),
    );
    setResendPending(false);
    if (!result.ok) {
      setResendFailure(result.failure);
      return;
    }
    writeSession(RESET_EMAIL_KEY, email);
    writeSession(RESET_SENT_AT_KEY, String(Date.now()));
    clearErrors('otp');
    onDigits([...EMPTY_CODE]);
    toast.success('New code sent', { description: `Check ${email}. It expires in 10 minutes.` });
    otpRef.current?.focus(0);
  }

  if (done) {
    return (
      <AuthColumn>
        <span className="mb-6 grid size-14 place-items-center rounded-md bg-aqua-tile text-info-ink">
          <Check aria-hidden size={24} strokeWidth={1.5} />
        </span>
        <AuthHeading title="Password updated" headingRef={headingRef}>
          Your new password is saved. Sign in to pick up where you left off.
        </AuthHeading>
        <Link href="/login" className={cx('btn btn-primary mt-8 w-full', FOCUS_RING)}>
          Sign in
        </Link>
      </AuthColumn>
    );
  }

  return (
    <AuthColumn>
      <AuthHeading title="Choose a new password">
        Enter the code from your email, then choose a new password.
      </AuthHeading>

      <form noValidate onSubmit={onSubmit} className="mt-8" aria-label="Choose a new password">
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

        <p id={codeLabelId} className="mt-5 text-small font-medium text-ink">
          6-digit code
        </p>
        <div className="mt-1.5">
          <OtpInput
            id="otp"
            ref={otpRef}
            value={digits}
            onChange={onDigits}
            labelledBy={codeLabelId}
            describedBy={`${codeHintId} otp-error`}
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
          className="mt-5"
          error={errors.password?.message}
          hint={<PasswordStrength password={password} />}
          {...register('password')}
        />

        <SubmitButton pending={pending} className="mt-6">
          Save new password
        </SubmitButton>
        {failure ? (
          <AuthAlert
            className="mt-3"
            onRetry={isRetryable(failure) ? () => void onSubmit() : undefined}
            retrying={pending}
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
          >
            {sendCodeMessage(resendFailure)}
          </AuthAlert>
        ) : null}
      </form>

      <ResendCode
        className="mt-6"
        secondsLeft={secondsLeft}
        pending={resendPending}
        onResend={() => void resend()}
      />
      <BackToSignIn className="mt-2" />
    </AuthColumn>
  );
}

/** Strength from length and variety. Live while typing (the one exception to validating on submit). */
function scorePassword(value: string): 0 | 1 | 2 | 3 {
  if (!value) return 0;
  if (value.length < PASSWORD_MIN) return 1;
  const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((re) => re.test(value)).length;
  if (value.length >= 14 || (value.length >= 12 && kinds >= 3)) return 3;
  if (value.length >= 10 || kinds >= 3) return 2;
  return 1;
}

const STRENGTH = {
  0: { label: '', tip: `Use at least ${PASSWORD_MIN} characters.` },
  1: { label: 'Weak', tip: `Use at least ${PASSWORD_MIN} characters. Longer is stronger.` },
  2: { label: 'Okay', tip: 'Add a few more characters, or use a short phrase.' },
  3: { label: 'Strong', tip: 'Save it in your password manager.' },
} as const;

function PasswordStrength({ password }: { password: string }) {
  const score = scorePassword(password);
  const { label, tip } = STRENGTH[score];
  return (
    <div className="flex flex-col gap-2">
      <span aria-hidden className={styles.meter} data-score={score}>
        <span />
        <span />
        <span />
      </span>
      <span aria-live="polite">
        {label ? <span className="font-medium text-ink-soft">{label}. </span> : null}
        {tip}
      </span>
    </div>
  );
}
