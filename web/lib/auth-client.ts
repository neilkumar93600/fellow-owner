import { emailOTPClient, inferAdditionalFields, usernameClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';

/**
 * Better Auth React client (02-trd §4). Requests go to /api/auth/* on the web origin, which
 * next.config rewrites to the Express API, so the session cookie stays first-party.
 * People log in with an email or a username and a password, or with Google, Apple or Facebook. A new
 * email account confirms its address with a 6-digit code (emailOTP) before its first session, and a
 * forgotten password is reset with one too.
 */
export const authClient = createAuthClient({
  plugins: [
    emailOTPClient(),
    usernameClient(),
    // Mirrors user.additionalFields in api/src/auth/index.ts, so signUp.email types the social profile.
    inferAdditionalFields({
      user: {
        socialPlatform: { type: 'string', required: false },
        socialHandle: { type: 'string', required: false },
      },
    }),
  ],
});

export const { useSession, signOut } = authClient;

/** Where the email is kept between /create-account (or /login) and /verify-otp (sessionStorage). */
export const OTP_EMAIL_KEY = 'fo:otp-email';
