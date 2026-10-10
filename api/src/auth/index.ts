import {
  isReservedHandle,
  LIMITS,
  socialHandleSchema,
  socialPlatformSchema,
} from '@fellow-owners/shared';
import { waitUntil } from '@vercel/functions';
import { type BetterAuthRateLimitStorage, betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { APIError, createAuthMiddleware, getSessionFromCtx } from 'better-auth/api';
import { verifyPassword } from 'better-auth/crypto';
import { emailOTP } from 'better-auth/plugins/email-otp';
import { username } from 'better-auth/plugins/username';
import { and, eq, ne } from 'drizzle-orm';
import { env as defaultEnv, type Env } from '../config/env.js';
import { type Db, db as defaultDb } from '../db/client.js';
import { account, session, user, verification } from '../db/schema/auth.js';
import { spaces } from '../db/schema/spaces.js';
import { logger as defaultLogger, type Logger, maskEmail } from '../lib/logger.js';
import { connected, redis as defaultRedis, type Redis } from '../lib/redis.js';
import { isDemoEmail } from './demo.js';
import { createEmailSender, type EmailSender } from './email.js';

/** Where Better Auth is mounted (create-app.ts) and what the web client calls through the rewrite. */
export const AUTH_BASE_PATH = '/api/auth';

const DAY_SECONDS = 60 * 60 * 24;

/** What the shared demo accounts may not do: change themselves, or see and end other visitors' sessions. */
const DEMO_LOCKED_PATHS = new Set([
  '/update-user',
  '/delete-user',
  '/change-email',
  '/list-sessions',
  '/revoke-session',
  '/revoke-sessions',
  '/revoke-other-sessions',
  '/link-social',
  '/unlink-account',
]);

export interface AuthDeps {
  db?: Db;
  env?: Env;
  logger?: Logger;
  email?: EmailSender;
  /** Rate-limit counters (lib/redis.ts); null keeps them in process memory. */
  redis?: Redis | null;
}

/** One atomic step per request: count the hit; the window's first hit sets the key's expiry. */
const RATE_LIMIT_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
local ttl = redis.call('PTTL', KEYS[1])
if ttl < 0 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
  ttl = tonumber(ARGV[1])
end
return {count, ttl}`;

/**
 * Better Auth's rate-limit counters in Redis (fixed windows): shared by every replica, kept across
 * deploys, each key gone when its window ends. While Redis is unreachable it fails open (logged)
 * after the 1 s command timeout: sign-in keeps working, unthrottled, until Redis is back.
 */
export function redisRateLimitStorage(redis: Redis, logger: Logger): BetterAuthRateLimitStorage {
  return {
    async consume(key, rule) {
      try {
        const [count, ttl] = (await connected(redis).eval(RATE_LIMIT_SCRIPT, {
          keys: [`rate-limit:${key}`],
          arguments: [String(rule.window * 1000)],
        })) as [number, number];
        if (count <= rule.max) return { allowed: true, retryAfter: null };
        return { allowed: false, retryAfter: Math.max(1, Math.ceil(ttl / 1000)) };
      } catch (error) {
        logger.warn({ err: error }, 'rate limit not checked: redis unavailable');
        return { allowed: true, retryAfter: null };
      }
    },
  };
}

/**
 * Better Auth (02-trd §4, 05 §5).
 *
 * - Accounts: email + password with a username (log in with either), or Google, Apple and
 *   Facebook, each on when its env pair is set. Facebook is Meta's login and stands in for
 *   Instagram, which has no login for personal accounts.
 * - A new email account gets no session until its email is confirmed. Sign-up answers
 *   `{ token: null }` and emails a 6-digit `email-verification` code; /email-otp/verify-email
 *   confirms it but opens no session: the web logs in with the password the person just typed
 *   (web/components/auth/pending-login.ts). An address that already has an account gets the same
 *   answer and no email. Logging in to an unconfirmed account answers 403 EMAIL_NOT_VERIFIED and
 *   emails a fresh code.
 * - Someone may sign up first with another person's email. So confirming an account that has a
 *   password also needs that password (`password` in the verify-email body, 401
 *   INVALID_EMAIL_OR_PASSWORD otherwise; the owner resets it instead), and confirming or resetting
 *   drops every OAuth link and session made before the inbox was proven (`dropUnprovenAccess`).
 * - Codes (emailOTP): 6 digits, 10 minutes, 5 attempts, stored hashed. They also reset a
 *   forgotten password (/email-otp/request-password-reset, /email-otp/reset-password), which ends
 *   every session. The link-based reset and /change-password stay disabled: no email carries a
 *   link. /sign-in/email-otp still works for API clients and the test helpers.
 * - One namespace (spec §11): a username is a handle. Same rules as a space handle (shared
 *   `LIMITS.username`, reserved words refused), and a username that is another person's space
 *   handle answers 409 HANDLE_TAKEN (databaseHooks). Space creation (spaces.service.ts) writes the
 *   owner's username = handle in its transaction, so the username unique constraint settles a
 *   race between the two. The optional social profile is `socialPlatform` + `socialHandle`,
 *   checked with the shared schemas.
 * - The demo accounts are ordinary, already confirmed password accounts (`ensureDemoUsers()`).
 * - `baseURL` is the WEB origin: the browser reaches /api/auth through the Next.js rewrite, so
 *   cookies are first-party and OAuth callbacks land on the web origin.
 * - Sessions: 7 days, refreshed daily; httpOnly, sameSite=lax, secure in production. They live in
 *   Postgres only.
 * - Rate limits (production): Better Auth's defaults per client IP and path, i.e. sign-in and
 *   sign-up 3 per 10 s, the email-code endpoints (send, verify, reset) 3 per 60 s, anything else
 *   100 per 10 s. Counted in Redis when REDIS_URL is set (`redisRateLimitStorage`), in process
 *   memory otherwise.
 */
export function createAuth(deps: AuthDeps = {}) {
  const env = deps.env ?? defaultEnv;
  const db = deps.db ?? defaultDb;
  const logger = (deps.logger ?? defaultLogger).child({ module: 'auth' });
  const email = deps.email ?? createEmailSender(env, deps.logger ?? defaultLogger);
  const redis = deps.redis === undefined ? defaultRedis : deps.redis;

  // The password sent with /email-otp/verify-email, read once the code is accepted.
  const confirmPasswords = new WeakMap<Request, unknown>();

  /** Drops the OAuth links and sessions an unconfirmed account gathered before its inbox was proven. */
  const dropUnprovenAccess = async (userId: string) => {
    await db
      .delete(account)
      .where(and(eq(account.userId, userId), ne(account.providerId, 'credential')));
    await db.delete(session).where(eq(session.userId, userId));
  };

  /** 409 HANDLE_TAKEN when `username` is the handle of a space someone else owns. */
  const assertNotSpaceHandle = async (username: unknown, userId?: string) => {
    if (typeof username !== 'string') return;
    const handle = username.trim().toLowerCase();
    const where = userId
      ? and(eq(spaces.handle, handle), ne(spaces.ownerUserId, userId))
      : eq(spaces.handle, handle);
    const [taken] = await db.select({ id: spaces.id }).from(spaces).where(where).limit(1);
    if (taken) {
      throw new APIError('CONFLICT', { code: 'HANDLE_TAKEN', message: 'That handle is taken' });
    }
  };

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
      minPasswordLength: LIMITS.password.min,
      maxPasswordLength: LIMITS.password.max,
      requireEmailVerification: true,
      revokeSessionsOnPasswordReset: true,
      // A reset by code also confirms the email (and replaces the password).
      onPasswordReset: async ({ user: owner }) => {
        if (!owner.emailVerified) await dropUnprovenAccess(owner.id);
      },
    },
    // The emailed "link" is a code: emailOTP's overrideDefaultEmailVerification below.
    emailVerification: {
      // Confirming proves the inbox, not the password: the session comes from logging in after it.
      autoSignInAfterVerification: false,
      sendOnSignIn: true,
      // Runs once the code is accepted. A password set before the inbox was proven is kept only for
      // someone who knows it; anyone else resets it.
      beforeEmailVerification: async (owner, request) => {
        if (owner.emailVerified) return;
        const [credential] = await db
          .select({ hash: account.password })
          .from(account)
          .where(and(eq(account.userId, owner.id), eq(account.providerId, 'credential')))
          .limit(1);
        if (credential?.hash) {
          const password = request ? confirmPasswords.get(request) : undefined;
          const proven =
            typeof password === 'string' &&
            (await verifyPassword({ hash: credential.hash, password }));
          if (!proven) {
            throw new APIError('UNAUTHORIZED', {
              code: 'INVALID_EMAIL_OR_PASSWORD',
              message: 'Invalid email or password',
            });
          }
        }
        await dropUnprovenAccess(owner.id);
      },
    },
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        const body = (ctx.body ?? {}) as Record<string, unknown>;

        if (ctx.path === '/email-otp/verify-email' && ctx.request) {
          confirmPasswords.set(ctx.request, body.password);
        }

        if (DEMO_LOCKED_PATHS.has(ctx.path)) {
          const current = await getSessionFromCtx(ctx);
          if (current && isDemoEmail(env, current.user.email)) {
            throw new APIError('FORBIDDEN', {
              code: 'DEMO_READ_ONLY',
              message: 'The demo accounts can’t be changed.',
            });
          }
        }

        if (
          ctx.path === '/sign-in/email' &&
          !env.DEMO_ENABLED &&
          typeof body.email === 'string' &&
          isDemoEmail(env, body.email)
        ) {
          throw new APIError('FORBIDDEN', { code: 'DEMO_DISABLED', message: 'The demo is off.' });
        }
      }),
    },
    databaseHooks: {
      user: {
        create: {
          before: async (data) => {
            await assertNotSpaceHandle(data.username);
          },
        },
        update: {
          // A user's own space never blocks them; without a session nothing is excluded.
          before: async (data, ctx) => {
            await assertNotSpaceHandle(data.username, ctx?.context.session?.user.id);
          },
        },
      },
    },
    user: {
      additionalFields: {
        socialPlatform: {
          type: 'string',
          required: false,
          input: true,
          validator: { input: socialPlatformSchema },
        },
        socialHandle: {
          type: 'string',
          required: false,
          input: true,
          // Stores the handle without its leading @.
          validator: { input: socialHandleSchema },
        },
      },
    },
    // Google, Apple and Facebook tokens are stored encrypted with BETTER_AUTH_SECRET. Nothing in the
    // API reads them today; older plain rows still read back (Better Auth decrypts only what looks
    // encrypted).
    account: { encryptOAuthTokens: true },
    socialProviders: {
      ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
        ? {
            google: {
              clientId: env.GOOGLE_CLIENT_ID,
              clientSecret: env.GOOGLE_CLIENT_SECRET,
              prompt: 'select_account' as const,
            },
          }
        : {}),
      ...(env.APPLE_CLIENT_ID && env.APPLE_CLIENT_SECRET
        ? {
            apple: {
              clientId: env.APPLE_CLIENT_ID,
              clientSecret: env.APPLE_CLIENT_SECRET,
              appBundleIdentifier: env.APPLE_APP_BUNDLE_IDENTIFIER,
            },
          }
        : {}),
      ...(env.FACEBOOK_CLIENT_ID && env.FACEBOOK_CLIENT_SECRET
        ? {
            facebook: {
              clientId: env.FACEBOOK_CLIENT_ID,
              clientSecret: env.FACEBOOK_CLIENT_SECRET,
            },
          }
        : {}),
    },
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
    rateLimit: {
      enabled: env.isProduction,
      ...(redis ? { customStorage: redisRateLimitStorage(redis, logger) } : {}),
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
    plugins: [
      emailOTP({
        otpLength: LIMITS.otp.length,
        expiresIn: LIMITS.otp.expiresInSeconds,
        allowedAttempts: LIMITS.otp.allowedAttempts,
        storeOTP: 'hashed',
        overrideDefaultEmailVerification: true,
        // Not awaited by the response (avoids timing leaks); kept alive with waitUntil on Vercel.
        sendVerificationOTP: async ({ email: to, otp, type }) => {
          const delivery = email.sendOtp({ to, code: otp, type }).catch((error: unknown) => {
            logger.error({ err: error, to: maskEmail(to), type }, 'sending the OTP email failed');
          });
          waitUntil(delivery);
        },
      }),
      username({
        minUsernameLength: LIMITS.username.min,
        maxUsernameLength: LIMITS.username.max,
        // The same trim + lowercase as usernameSchema, so the stored value is the one it checks.
        usernameNormalization: (value) => value.trim().toLowerCase(),
        // Also runs on raw input (/is-username-available, /sign-in/username), so it normalizes
        // first. Reserved words are refused everywhere, log-in included: nobody can hold one.
        usernameValidator: (value) => {
          const handle = value.trim().toLowerCase();
          return LIMITS.username.pattern.test(handle) && !isReservedHandle(handle);
        },
        validationOrder: { username: 'post-normalization' },
        displayUsername: false,
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
