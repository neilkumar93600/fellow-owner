import { LIMITS } from '@fellow-owners/shared';
import { waitUntil } from '@vercel/functions';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import { emailOTP } from 'better-auth/plugins/email-otp';
import { env as defaultEnv, type Env } from '../config/env.js';
import { type Db, db as defaultDb } from '../db/client.js';
import { account, session, user, verification } from '../db/schema/auth.js';
import { logger as defaultLogger, type Logger, maskEmail } from '../lib/logger.js';
import { createEmailSender, type EmailSender } from './email.js';

/** Where Better Auth is mounted (create-app.ts) and what the web client calls through the rewrite. */
export const AUTH_BASE_PATH = '/api/auth';

const DAY_SECONDS = 60 * 60 * 24;

export interface AuthDeps {
  db?: Db;
  env?: Env;
  logger?: Logger;
  email?: EmailSender;
}

/**
 * Better Auth (02-trd §4, 05 §5).
 *
 * - Sign-in and sign-up are one step: a 6-digit email code (emailOTP: 6 digits, 10 minutes,
 *   5 attempts, stored hashed) or Google when GOOGLE_CLIENT_ID/SECRET are set.
 * - `baseURL` is the WEB origin: the browser reaches /api/auth through the Next.js rewrite, so
 *   cookies are first-party and OAuth callbacks land on the web origin.
 * - Email + password exists ONLY for the two seeded demo accounts: sign-up is disabled, password
 *   reset/change routes are disabled, and a before-hook rejects /sign-in/email for any other email
 *   (or when DEMO_ENABLED=false). The demo accounts get their credential row from
 *   `ensureDemoUsers()` (auth/demo.ts). Turning on passwords for everyone (01, Q8) means removing
 *   the hook, enabling sign-up and adding the reset flow.
 * - Sessions: 7 days, refreshed daily; httpOnly, sameSite=lax, secure in production.
 */
export function createAuth(deps: AuthDeps = {}) {
  const env = deps.env ?? defaultEnv;
  const db = deps.db ?? defaultDb;
  const logger = (deps.logger ?? defaultLogger).child({ module: 'auth' });
  const email = deps.email ?? createEmailSender(env, deps.logger ?? defaultLogger);
  const demoEmails = new Set([env.DEMO_CREATOR_EMAIL, env.DEMO_FAN_EMAIL]);

  return betterAuth({
    appName: 'Fellow Owners',
    baseURL: env.BETTER_AUTH_URL,
    basePath: AUTH_BASE_PATH,
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: env.TRUSTED_ORIGINS,
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema: { user, session, account, verification },
    }),
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      minPasswordLength: 8,
    },
    socialProviders:
      env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
        ? {
            google: {
              clientId: env.GOOGLE_CLIENT_ID,
              clientSecret: env.GOOGLE_CLIENT_SECRET,
              prompt: 'select_account',
            },
          }
        : undefined,
    session: {
      expiresIn: 7 * DAY_SECONDS,
      updateAge: DAY_SECONDS,
      // Signed short-lived copy of the session in a cookie: most API calls skip the session query.
      cookieCache: { enabled: true, maxAge: 5 * 60 },
    },
    advanced: {
      useSecureCookies: env.isProduction,
      defaultCookieAttributes: {
        httpOnly: true,
        sameSite: 'lax',
        secure: env.isProduction,
      },
    },
    disabledPaths: [
      '/change-password',
      '/request-password-reset',
      '/reset-password',
      '/forget-password',
    ],
    telemetry: { enabled: false },
    logger: {
      level: env.isProduction ? 'warn' : 'info',
      log: (level, message, ...args) => {
        const payload = args.length > 0 ? { args } : {};
        if (level === 'error') logger.error(payload, message);
        else if (level === 'warn') logger.warn(payload, message);
        else if (level === 'debug') logger.debug(payload, message);
        else logger.info(payload, message);
      },
    },
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path !== '/sign-in/email') return;
        const body = ctx.body as { email?: unknown } | undefined;
        const address = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
        if (!env.DEMO_ENABLED || !demoEmails.has(address)) {
          throw new APIError('FORBIDDEN', {
            message: 'Password sign-in is only available for the demo accounts',
          });
        }
      }),
    },
    plugins: [
      emailOTP({
        otpLength: LIMITS.otp.length,
        expiresIn: LIMITS.otp.expiresInSeconds,
        allowedAttempts: LIMITS.otp.allowedAttempts,
        storeOTP: 'hashed',
        // Not awaited by the response (avoids timing leaks); kept alive with waitUntil on Vercel.
        sendVerificationOTP: async ({ email: to, otp, type }) => {
          const delivery = email.sendOtp({ to, code: otp, type }).catch((error: unknown) => {
            logger.error({ err: error, to: maskEmail(to), type }, 'sending the OTP email failed');
          });
          waitUntil(delivery);
        },
      }),
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;

/** `{ session, user }` as returned by auth.api.getSession. Attached to `req.session`. */
export type AuthSession = Auth['$Infer']['Session'];
export type AuthUser = AuthSession['user'];

/** The process-wide Better Auth instance (uses the shared db, env and logger). */
export const auth: Auth = createAuth();
