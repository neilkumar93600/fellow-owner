'use client';

import { LIMITS, otpCodeSchema } from '@fellow-owners/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { Check } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { authClient, OTP_EMAIL_KEY } from '@/lib/auth-client';
import { getQueryClient } from '@/lib/query-client';

import styles from './auth.module.css';
import { cx, LINK_HIT_AREA } from './auth-classes';
import { type AuthFailure, formatWait, isRetryable, runAuth, sendCodeMessage } from './auth-errors';
import { AuthField, AuthPasswordField } from './auth-field';
import { EMPTY_CODE, OtpInput, type OtpInputHandle } from './auth-otp-input';
import { ResendCode } from './auth-resend';
import { DEFAULT_DESTINATION, withReturnTo } from './auth-return-to';
import { type EmailFormValues, emailFormSchema } from './auth-schemas';
import {
  formatCountdown,
  OTP_SENT_AT_KEY,
  RESET_EMAIL_KEY,
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
  TEXT_LINK,
} from './auth-ui';
import { forgetPendingLogin, heldPassword } from './pending-login';

const ALLOWED_ATTEMPTS = LIMITS.otp.allowedAttempts;
const RESEND_AFTER_MS = LIMITS.otp.resendAfterSeconds * 1000;

type Status =
  | { kind: 'idle' }
  | { kind: 'incomplete' }
  /** `retrying` keeps the last failure's alert (and its focused Retry) on screen during the attempt. */
  | { kind: 'verifying'; retrying?: AuthFailure }
  | { kind: 'wrong'; triesLeft: number }
  | { kind: 'expired' }
  | { kind: 'locked' }
  | { kind: 'failed'; failure: AuthFailure }
  /** The email is confirmed, but logging in right after it failed. */
  | { kind: 'confirmed' }
  /** The account has another password (maybe set by someone who signed up first with this email). */
  | { kind: 'mismatch' }
  | { kind: 'success' };

/**
 * /verify-otp: confirms the email of a new account with the 6‑digit code Better Auth sent. The API
 * takes the code together with the account's password and opens no session, so the screen sends the
 * password typed on /create-account or /login (held in memory, pending-login.ts), then logs in with it.
 * After a reload nothing is held and the screen asks for the password. The email comes from
 * sessionStorage (set on those two screens). Until it is read the screen keeps its final shape with the
 * address as a skeleton; without one it asks for the address.
 */
export function OtpForm({ returnTo }: { returnTo: string | null }) {
  const email = useSessionValue(OTP_EMAIL_KEY);
  if (email === null) return <AskEmail />;
  return <OtpEntry email={email} returnTo={returnTo} />;
}

function OtpEntry({ email, returnTo }: { email: string | undefined; returnTo: string | null }) {
  const router = useRouter();
  const labelId = useId();
  const hintId = useId();
  const messageId = useId();
  const waitId = useId();
  const otpRef = useRef<OtpInputHandle>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const sendNewRef = useRef<HTMLButtonElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const busy = useRef(false);
  const succeeded = useRef(false);

  const [digits, setDigits] = useState<string[]>([...EMPTY_CODE]);
  const [typedPassword, setTypedPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [failures, setFailures] = useState(0);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [resendPending, setResendPending] = useState(false);
  const [resendFailure, setResendFailure] = useState<AuthFailure | null>(null);

  const sentAtRaw = useSessionValue(OTP_SENT_AT_KEY);
  const sentAt = sentAtRaw ? Number(sentAtRaw) : Number.NaN;
  const secondsLeft = useSecondsUntil(Number.isFinite(sentAt) ? sentAt + RESEND_AFTER_MS : null);

  const known = typeof email === 'string';
  const held = known ? heldPassword(email) : null;
  const asksPassword = known && held === null;
  const needsNewCode = status.kind === 'expired' || status.kind === 'locked';
  const verifying = status.kind === 'verifying';
  const done = status.kind === 'success';
  const destination = returnTo ?? DEFAULT_DESTINATION;
  const changeHref = withReturnTo('/create-account', returnTo);

  // The stored email is only needed until the session exists. Clear it once we leave.
  useEffect(
    () => () => {
      if (!succeeded.current) return;
      writeSession(OTP_EMAIL_KEY, null);
      writeSession(OTP_SENT_AT_KEY, null);
    },
    [],
  );

  // A used-up code disables the boxes, which drops focus to the page. Hand it to the one action left,
  // "Send a new code" (focusable during its countdown), unless the visitor has already moved elsewhere.
  useEffect(() => {
    if (!needsNewCode) return;
    const active = document.activeElement;
    if (!active || active === document.body || formRef.current?.contains(active)) {
      sendNewRef.current?.focus();
    }
  }, [needsNewCode]);

  async function verify(code: string) {
    if (!email || busy.current || needsNewCode || status.kind === 'success') return;
    const parsed = otpCodeSchema.safeParse(code);
    if (!parsed.success) {
      setStatus({ kind: 'incomplete' });
      otpRef.current?.focus();
      return;
    }
    const password = held ?? typedPassword;
    if (!password) {
      setPasswordError('Enter your password');
      passwordRef.current?.focus();
      return;
    }

    busy.current = true;
    setStatus({
      kind: 'verifying',
      retrying: status.kind === 'failed' ? status.failure : undefined,
    });
    // `password` is not in the client's types: the API reads it in a hook (api/src/auth/index.ts).
    const result = await runAuth((fetchOptions) =>
      authClient.$fetch('/email-otp/verify-email', {
        method: 'POST',
        body: { email, otp: parsed.data, password },
        ...fetchOptions,
      }),
    );

    if (result.ok) {
      // Confirmed. The session comes from the password, never from the code.
      forgetPendingLogin();
      const login = await runAuth((fetchOptions) =>
        authClient.signIn.email({ email, password, rememberMe: true, fetchOptions }),
      );
      busy.current = false;
      if (!login.ok) {
        setStatus({ kind: 'confirmed' });
        return;
      }
      succeeded.current = true;
      getQueryClient().clear();
      setStatus({ kind: 'success' });
      router.replace(destination);
      return;
    }

    busy.current = false;
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
      case 'invalid_credentials':
        forgetPendingLogin();
        setStatus({ kind: 'mismatch' });
        return;
      default:
        setStatus({ kind: 'failed', failure });
        otpRef.current?.focus();
    }
  }

  async function resend() {
    if (!email || resendPending || secondsLeft > 0) return;
    // An earlier failure stays up during the attempt, so its Retry keeps focus and shows the spinner.
    setResendPending(true);
    const result = await runAuth((fetchOptions) =>
      authClient.emailOtp.sendVerificationOtp({ email, type: 'email-verification', fetchOptions }),
    );
    setResendPending(false);
    if (!result.ok) {
      setResendFailure(result.failure);
      return;
    }
    setResendFailure(null);
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

  const verifyFailure =
    status.kind === 'failed'
      ? status.failure
      : status.kind === 'verifying'
        ? (status.retrying ?? null)
        : null;
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

  if ((status.kind === 'confirmed' || status.kind === 'mismatch') && typeof email === 'string') {
    return <NextStep email={email} returnTo={returnTo} mismatch={status.kind === 'mismatch'} />;
  }

  return (
    <AuthCard size="medium">
      <AuthHeading title="Check your email">
        We sent a 6‑digit code to{' '}
        {known ? (
          <span className="font-medium text-ink">{email}</span>
        ) : (
          <span
            aria-hidden
            className="inline-block h-3.5 w-36 translate-y-0.5 rounded-full bg-table-head"
          />
        )}
        . Enter it{asksPassword ? ' with your password' : ''} to confirm your email.{' '}
        <Link href={changeHref} className={cx(TEXT_LINK, LINK_HIT_AREA)}>
          Change
        </Link>
      </AuthHeading>

      <form
        ref={formRef}
        method="post"
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
          6‑digit code
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
            describedBy={hintId}
            inputDescribedBy={messageId}
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
        {asksPassword ? (
          <div className="mt-5">
            <AuthPasswordField
              ref={passwordRef}
              id="password"
              label="Password"
              autoComplete="current-password"
              value={typedPassword}
              onChange={(event) => {
                setTypedPassword(event.target.value);
                setPasswordError(null);
              }}
              error={passwordError ?? undefined}
            />
          </div>
        ) : null}

        {needsNewCode ? (
          <>
            <SubmitButton
              ref={sendNewRef}
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
          // One button for both states, so focus stays on it when the code is accepted.
          <SubmitButton
            className="mt-6"
            type={done ? 'button' : 'submit'}
            pending={verifying}
            done={done}
            icon={done ? <SuccessIcon /> : undefined}
          >
            {done ? 'Email confirmed' : 'Confirm email'}
          </SubmitButton>
        )}
        {/* Always mounted, so the message is announced when it is filled in. */}
        <p role="status" className="text-center text-small text-ink-soft">
          {done ? (
            <span className={cx(styles.enter, 'mt-3 block')}>
              You’re in. Taking you {returnTo ? 'back where you left off' : 'to your dashboard'}.
            </span>
          ) : null}
        </p>

        {verifyAlert ? (
          <AuthAlert
            className="mt-3"
            onRetry={
              verifyFailure && isRetryable(verifyFailure)
                ? () => void verify(digits.join(''))
                : undefined
            }
            retrying={verifying}
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
      {status.kind !== 'success' ? (
        <p className="mt-4 border-t border-line pt-5 text-center text-small text-ink-muted">
          Already have an account with this email?{' '}
          <Link href={withReturnTo('/login', returnTo)} className={TEXT_LINK}>
            Log in
          </Link>{' '}
          or{' '}
          <Link href={withReturnTo('/forgot-password', returnTo)} className={TEXT_LINK}>
            reset your password
          </Link>
          .
        </p>
      ) : null}
    </AuthCard>
  );
}

/**
 * No session after the code. Either the email is confirmed but the log-in right after it failed (Log
 * in), or the account has another password, maybe set by someone who signed up first with this address
 * (`mismatch`: the email stays unconfirmed, and a reset by code proves the inbox and replaces the
 * password). The address stays in sessionStorage, so /login and /forgot-password open with it filled in.
 */
function NextStep({
  email,
  returnTo,
  mismatch,
}: {
  email: string;
  returnTo: string | null;
  mismatch: boolean;
}) {
  const headingRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <AuthCard size="short">
      {mismatch ? null : (
        <span className="mx-auto mb-6 grid size-14 place-items-center rounded-md bg-aqua-tile text-info-ink">
          <Check aria-hidden size={24} strokeWidth={1.5} />
        </span>
      )}
      <AuthHeading
        title={mismatch ? 'Password doesn’t match' : 'Email confirmed'}
        headingRef={headingRef}
      >
        {mismatch
          ? 'This email has an account with a different password. Reset it to choose your own, then log in.'
          : 'Log in with your password to continue.'}
      </AuthHeading>
      {mismatch ? (
        <>
          <Link
            href={withReturnTo('/forgot-password', returnTo)}
            onClick={() => writeSession(RESET_EMAIL_KEY, email)}
            className={cx('btn btn-primary mt-8 w-full', FOCUS_RING)}
          >
            Reset password
          </Link>
          <p className="mt-5 text-center text-small text-ink-muted">
            Know the password?{' '}
            <Link href={withReturnTo('/login', returnTo)} className={TEXT_LINK}>
              Log in
            </Link>
          </p>
        </>
      ) : (
        <Link
          href={withReturnTo('/login', returnTo)}
          className={cx('btn btn-primary mt-8 w-full', FOCUS_RING)}
        >
          Log in
        </Link>
      )}
    </AuthCard>
  );
}

function SuccessIcon() {
  return (
    <span className="grid size-5 place-items-center rounded-full bg-card-strong/20">
      <Check aria-hidden size={14} strokeWidth={2} />
    </span>
  );
}

/**
 * No address in this tab (a new tab, a cleared session, or a username log-in for an unconfirmed
 * account). Ask for it and send a fresh code; storing it switches this screen to the code step.
 */
function AskEmail() {
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<AuthFailure | null>(null);
  const inFlight = useRef(false);
  const {
    register,
    handleSubmit,
    setError,
    setFocus,
    formState: { errors },
  } = useForm<EmailFormValues>({
    resolver: zodResolver(emailFormSchema),
    defaultValues: { email: '' },
  });

  useEffect(() => {
    if (window.matchMedia('(pointer: fine)').matches) setFocus('email');
  }, [setFocus]);

  const onSubmit = handleSubmit(async ({ email }) => {
    if (inFlight.current) return;
    // A username log-in just sent a code: a second one would make it stop working. A wrong address
    // is fixed with "Send a new code" once the wait is over.
    if (Date.now() - Number(readSession(OTP_SENT_AT_KEY)) < RESEND_AFTER_MS) {
      writeSession(OTP_EMAIL_KEY, email);
      return;
    }
    inFlight.current = true;
    // An earlier failure stays up during the attempt, so its Retry keeps focus and shows the spinner.
    setPending(true);
    const result = await runAuth((fetchOptions) =>
      authClient.emailOtp.sendVerificationOtp({ email, type: 'email-verification', fetchOptions }),
    );
    inFlight.current = false;
    setPending(false);
    if (!result.ok) {
      if (result.failure.kind === 'invalid_email') {
        setFailure(null);
        setError('email', { message: 'Enter a valid email' }, { shouldFocus: true });
      } else {
        setFailure(result.failure);
      }
      return;
    }
    writeSession(OTP_SENT_AT_KEY, String(Date.now()));
    writeSession(OTP_EMAIL_KEY, email);
  });

  return (
    <AuthCard size="short">
      <AuthHeading title="Confirm your email">
        Enter the email on your account to get to your code.
      </AuthHeading>
      <form
        method="post"
        noValidate
        onSubmit={onSubmit}
        className="mt-8"
        aria-label="Send a confirmation code"
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
          Send code
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
    </AuthCard>
  );
}
