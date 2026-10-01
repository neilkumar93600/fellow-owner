'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useRef, useState } from 'react';
import { authClient, OTP_EMAIL_KEY, SIGNUP_NAME_KEY } from '@/lib/auth-client';
import { type AuthFailure, runAuth } from './auth-errors';
import { withReturnTo } from './auth-return-to';
import { OTP_SENT_AT_KEY, writeSession } from './auth-storage';

interface SendInput {
  email: string;
  /** Only from /sign-up: applied to the user once the code is verified. */
  name?: string;
}

/**
 * The shared "Email me a code" step of /login and /sign-up: asks Better Auth for a sign-in code, keeps the
 * email (and name) in sessionStorage for /verify-otp, then moves on. On failure nothing typed is lost;
 * the form's Retry simply submits again. An earlier failure stays on screen while the next attempt runs,
 * so its alert (and the Retry button that has focus) stays put and shows the retrying spinner.
 */
export function useSendCode({ returnTo }: { returnTo: string | null }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<AuthFailure | null>(null);
  const inFlight = useRef(false);

  const send = useCallback(
    async (input: SendInput) => {
      if (inFlight.current) return;
      inFlight.current = true;
      setPending(true);

      const result = await runAuth((fetchOptions) =>
        authClient.emailOtp.sendVerificationOtp({
          email: input.email,
          type: 'sign-in',
          fetchOptions,
        }),
      );

      if (!result.ok) {
        inFlight.current = false;
        setPending(false);
        setFailure(result.failure);
        return;
      }

      setFailure(null);
      writeSession(OTP_EMAIL_KEY, input.email);
      writeSession(OTP_SENT_AT_KEY, String(Date.now()));
      writeSession(SIGNUP_NAME_KEY, input.name ?? null);
      // Stay pending while the next screen loads, so the button cannot be pressed twice.
      router.push(withReturnTo('/verify-otp', returnTo));
    },
    [returnTo, router],
  );

  const clearFailure = useCallback(() => setFailure(null), []);

  return { send, pending, failure, clearFailure };
}
