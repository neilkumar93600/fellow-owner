'use client';

import { LIMITS, otpCodeSchema } from '@fellow-owners/shared';
import { Check } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import { toast } from 'sonner';
import { authClient, OTP_EMAIL_KEY, SIGNUP_NAME_KEY } from '@/lib/auth-client';

import styles from './auth.module.css';
import { cx, LINK_HIT_AREA } from './auth-classes';
import { type AuthFailure, formatWait, isRetryable, runAuth, sendCodeMessage } from './auth-errors';
import { EMPTY_CODE, OtpInput, type OtpInputHandle } from './auth-otp-input';
import { ResendCode } from './auth-resend';
import { DEFAULT_DESTINATION, withReturnTo } from './auth-return-to';
import {
  formatCountdown,
  OTP_SENT_AT_KEY,
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
  TEXT_LINK,
} from './auth-ui';

const ALLOWED_ATTEMPTS = LIMITS.otp.allowedAttempts;
const RESEND_AFTER_MS = LIMITS.otp.resendAfterSeconds * 1000;

type Status =
  | { kind: 'idle' }
  | { kind: 'incomplete' }
  | { kind: 'verifying' }
  | { kind: 'wrong'; triesLeft: number }
  | { kind: 'expired' }
  | { kind: 'locked' }
  | { kind: 'failed'; failure: AuthFailure }
  | { kind: 'success' };

/**
 * /verify-otp. The email comes from sessionStorage (set on /login or /sign-up). Until it is read the
 * screen keeps its final shape with the address as a skeleton; without one it explains how to start.
 */
export function OtpForm({ returnTo }: { returnTo: string | null }) {
  const email = useSessionValue(OTP_EMAIL_KEY);
  const name = useSessionValue(SIGNUP_NAME_KEY);
  if (email === null) return <MissingEmail returnTo={returnTo} />;
  return <OtpEntry email={email} name={name ?? null} returnTo={returnTo} />;
}

function OtpEntry({
  email,
  name,
  returnTo,
}: {
  email: string | undefined;
  name: string | null;
  returnTo: string | null;
}) {
  const router = useRouter();
  const labelId = useId();
  const hintId = useId();
  const messageId = useId();
  const waitId = useId();
  const otpRef = useRef<OtpInputHandle>(null);
  const busy = useRef(false);
  const succeeded = useRef(false);

  const [digits, setDigits] = useState<string[]>([...EMPTY_CODE]);
  const [failures, setFailures] = useState(0);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [resendPending, setResendPending] = useState(false);
  const [resendFailure, setResendFailure] = useState<AuthFailure | null>(null);

  const sentAtRaw = useSessionValue(OTP_SENT_AT_KEY);
  const sentAt = sentAtRaw ? Number(sentAtRaw) : Number.NaN;
  const secondsLeft = useSecondsUntil(Number.isFinite(sentAt) ? sentAt + RESEND_AFTER_MS : null);

  const known = typeof email === 'string';
  const needsNewCode = status.kind === 'expired' || status.kind === 'locked';
  const verifying = status.kind === 'verifying';
  const destination = returnTo ?? DEFAULT_DESTINATION;
  const changeHref = withReturnTo(name ? '/sign-up' : '/login', returnTo);

  // The stored email and name are only needed until the session exists. Clear them once we leave.
  useEffect(
    () => () => {
      if (!succeeded.current) return;
      writeSession(OTP_EMAIL_KEY, null);
      writeSession(SIGNUP_NAME_KEY, null);
      writeSession(OTP_SENT_AT_KEY, null);
    },
    [],
  );

  async function verify(code: string) {
    if (!email || busy.current || needsNewCode || status.kind === 'success') return;
    const parsed = otpCodeSchema.safeParse(code);
    if (!parsed.success) {
      setStatus({ kind: 'incomplete' });
      otpRef.current?.focus();
      return;
    }

    busy.current = true;
    setStatus({ kind: 'verifying' });
    const result = await runAuth((fetchOptions) =>
      authClient.signIn.emailOtp({
        email,
        otp: parsed.data,
        ...(name ? { name } : {}),
        fetchOptions,
      }),
    );
    busy.current = false;

    if (result.ok) {
      // A new account already took the name at sign in; an existing one gets it here.
      if (name && result.data?.user?.name !== name) {
        await runAuth((fetchOptions) => authClient.updateUser({ name, fetchOptions }));
      }
      succeeded.current = true;
      setStatus({ kind: 'success' });
      router.replace(destination);
      return;
    }

    const { failure } = result;
    switch (failure.kind) {
      case 'invalid_otp': {
        const used = failures + 1;
        const triesLeft = ALLOWED_ATTEMPTS - used;
        setFailures(used);
        setDigits([...EMPTY_CODE]);
        if (triesLeft <= 0) {
          setStatus({ kind: 'locked' });
        } else {
          setStatus({ kind: 'wrong', triesLeft });
          otpRef.current?.focus(0);
        }
        return;
      }
      case 'otp_expired':
        setStatus({ kind: 'expired' });
        return;
      case 'too_many_attempts':
        setStatus({ kind: 'locked' });
        return;
      default:
        setStatus({ kind: 'failed', failure });
        otpRef.current?.focus();
    }
  }

  async function resend() {
    if (!email || resendPending || secondsLeft > 0) return;
    setResendPending(true);
    setResendFailure(null);
    const result = await runAuth((fetchOptions) =>
      authClient.emailOtp.sendVerificationOtp({ email, type: 'sign-in', fetchOptions }),
    );
    setResendPending(false);
    if (!result.ok) {
      setResendFailure(result.failure);
      return;
    }
    writeSession(OTP_SENT_AT_KEY, String(Date.now()));
    setFailures(0);
    setDigits([...EMPTY_CODE]);
    setStatus({ kind: 'idle' });
    toast.success('New code sent', { description: `Check ${email}. It expires in 10 minutes.` });
    otpRef.current?.focus(0);
  }

  const fieldMessage = (() => {
    switch (status.kind) {
      case 'incomplete':
        return `Enter all ${LIMITS.otp.length} digits.`;
      case 'wrong':
        return `That code didn’t match. ${status.triesLeft} ${status.triesLeft === 1 ? 'try' : 'tries'} left.`;
      case 'expired':
        return 'This code expired. Send a new one.';
      case 'locked':
        return 'Too many tries for this code. Send a new one.';
      case 'failed':
        return status.failure.kind === 'rejected' && status.failure.message
          ? status.failure.message
          : null;
      default:
        return null;
    }
  })();

  const verifyFailure = status.kind === 'failed' ? status.failure : null;
  const verifyAlert = (() => {
    if (!verifyFailure || verifyFailure.kind === 'rejected') return null;
    if (verifyFailure.kind === 'rate_limited') {
      const wait = verifyFailure.retryAfterSeconds;
      return wait
        ? `Too many tries in a row. Try again in ${formatWait(wait)}.`
        : 'Too many tries in a row. Wait a minute, then try again.';
    }
    return 'We couldn’t check your code right now. Check your connection and try again.';
  })();

  return (
    <AuthColumn>
      <AuthHeading title="Check your email">
        We sent a 6-digit code to{' '}
        {known ? (
          <span className="font-medium text-ink">{email}</span>
        ) : (
          <span
            aria-hidden
            className="inline-block h-3.5 w-36 translate-y-0.5 rounded-full bg-table-head"
          />
        )}
        .{' '}
        <Link href={changeHref} className={cx(TEXT_LINK, LINK_HIT_AREA)}>
          Change
        </Link>
      </AuthHeading>

      <form
        noValidate
        className="mt-8"
        aria-label="Enter your code"
        onSubmit={(event) => {
          event.preventDefault();
          if (needsNewCode) void resend();
          else void verify(digits.join(''));
        }}
      >
        <p id={labelId} className="text-small font-medium text-ink">
          6-digit code
        </p>
        <div className="mt-1.5">
          <OtpInput
            id="otp"
            ref={otpRef}
            value={digits}
            onChange={(next) => {
              setDigits(next);
              if (status.kind === 'incomplete' || status.kind === 'wrong') {
                setStatus({ kind: 'idle' });
              }
            }}
            onComplete={(code) => void verify(code)}
            labelledBy={labelId}
            describedBy={`${hintId} ${messageId}`}
            invalid={fieldMessage !== null}
            disabled={needsNewCode}
            readOnly={verifying || status.kind === 'success'}
            autoFocus
          />
        </div>
        <FieldMessage id={messageId} message={fieldMessage} />
        <p id={hintId} className="mt-1.5 text-small text-ink-muted">
          Codes expire after 10 minutes. Check spam if it’s not in your inbox.
        </p>

        {status.kind === 'success' ? (
          <div className="mt-6">
            <SubmitButton type="button" done icon={<SuccessIcon />}>
              Signed in
            </SubmitButton>
            <p
              role="status"
              className={cx(styles.enter, 'mt-3 text-center text-small text-ink-soft')}
            >
              You’re in. Taking you {returnTo ? 'back where you left off' : 'to your dashboard'}.
            </p>
          </div>
        ) : needsNewCode ? (
          <>
            <SubmitButton
              className="mt-6"
              pending={resendPending}
              disabled={secondsLeft > 0}
              describedBy={secondsLeft > 0 ? `${messageId} ${waitId}` : messageId}
            >
              Send a new code
            </SubmitButton>
            {secondsLeft > 0 ? (
              <p id={waitId} className="mt-3 text-center text-small text-ink-muted tabular">
                You can send a new code in {formatCountdown(secondsLeft)}.
              </p>
            ) : null}
          </>
        ) : (
          <SubmitButton className="mt-6" pending={verifying}>
            Verify code
          </SubmitButton>
        )}

        {verifyAlert ? (
          <AuthAlert
            className="mt-3"
            onRetry={
              verifyFailure && isRetryable(verifyFailure)
                ? () => void verify(digits.join(''))
                : undefined
            }
          >
            {verifyAlert}
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

      {known && !needsNewCode && status.kind !== 'success' ? (
        <ResendCode
          className="mt-6"
          secondsLeft={secondsLeft}
          pending={resendPending}
          onResend={() => void resend()}
        />
      ) : null}
    </AuthColumn>
  );
}

function SuccessIcon() {
  return (
    <span className="grid size-5 place-items-center rounded-full bg-white/20">
      <Check aria-hidden size={14} strokeWidth={2} />
    </span>
  );
}

function MissingEmail({ returnTo }: { returnTo: string | null }) {
  return (
    <AuthColumn>
      <AuthHeading title="Start with your email">
        We don’t know which inbox to check. Start from sign in and we’ll email you a new code.
      </AuthHeading>
      <Link
        href={withReturnTo('/login', returnTo)}
        className={cx('btn btn-primary mt-8 w-full', FOCUS_RING)}
      >
        Go to sign in
      </Link>
      <p className="mt-8 text-center text-body text-ink-muted">
        New here?{' '}
        <Link href={withReturnTo('/sign-up', returnTo)} className={cx(TEXT_LINK, LINK_HIT_AREA)}>
          Create an account
        </Link>
      </p>
    </AuthColumn>
  );
}
