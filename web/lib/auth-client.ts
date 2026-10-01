import { emailOTPClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';

/**
 * Better Auth React client (02-trd §4). Requests go to /api/auth/* on the web origin, which
 * next.config rewrites to the Express API, so the session cookie stays first-party.
 * Sign in and sign up are the same step: a 6-digit email code (emailOTP) or Google.
 */
export const authClient = createAuthClient({
  plugins: [emailOTPClient()],
});

export const { useSession, signOut } = authClient;

/** Where the email is kept between /login or /sign-up and /verify-otp (sessionStorage, per 03-app-flow). */
export const OTP_EMAIL_KEY = 'fo:otp-email';
/** The name typed on /sign-up, applied to the user once the code is verified. */
export const SIGNUP_NAME_KEY = 'fo:signup-name';
