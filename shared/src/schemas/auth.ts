import { z } from 'zod';
import { SOCIAL_PLATFORMS } from '../enums.js';
import { LIMITS } from '../limits.js';
import { isReservedHandle } from '../reserved-handles.js';

export const emailSchema = z.email('Enter a valid email').trim().toLowerCase().max(254);

export const nameSchema = z
  .string()
  .trim()
  .min(LIMITS.membership.name.min, 'Add your name')
  .max(LIMITS.membership.name.max, `Up to ${LIMITS.membership.name.max} characters`);

/**
 * The handle on /create-account: the page link and the sign-in name, so the same rules as a space
 * handle (LIMITS.username is LIMITS.handle). Better Auth's username plugin checks the same rules.
 */
export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(LIMITS.username.min, `At least ${LIMITS.username.min} characters`)
  .max(LIMITS.username.max, `Up to ${LIMITS.username.max} characters`)
  .regex(LIMITS.username.pattern, 'Use lowercase letters, numbers, underscores and periods')
  .refine((username) => !isReservedHandle(username), 'That handle is reserved. Pick another.');

export const passwordSchema = z
  .string()
  .min(LIMITS.password.min, `Use at least ${LIMITS.password.min} characters`)
  .max(LIMITS.password.max, `Use ${LIMITS.password.max} characters or fewer`);

export const socialPlatformSchema = z.enum(SOCIAL_PLATFORMS);

/** "@mira.k" and "mira.k" are the same handle: the @ is dropped before it is checked and stored. */
export const socialHandleSchema = z
  .string()
  .trim()
  .transform((handle) => handle.replace(/^@+/, ''))
  .pipe(
    z
      .string()
      .min(1, 'Add your handle')
      .max(LIMITS.socialHandle.max, `Up to ${LIMITS.socialHandle.max} characters`)
      .regex(LIMITS.socialHandle.pattern, 'Use letters, numbers, periods, underscores and hyphens'),
  );

/** /create-account (POST /api/auth/sign-up/email). The social profile is optional, sent as a pair. */
export const createAccountSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  username: usernameSchema,
  password: passwordSchema,
  socialPlatform: socialPlatformSchema.optional(),
  socialHandle: socialHandleSchema.optional(),
});
export type CreateAccountInput = z.input<typeof createAccountSchema>;

/** GET /api/handle-available?h=: any text; a bad handle answers `reason: 'invalid'`, not 400. */
export const handleAvailableQuerySchema = z.object({
  h: z.string().trim().toLowerCase().min(1).max(100),
});

/** /login: one field takes an email or a username. */
export const logInSchema = z.object({
  identifier: z.string().trim().min(1, 'Enter your email or username').max(254),
  password: z.string().min(1, 'Enter your password').max(LIMITS.password.max),
});
export type LogInInput = z.input<typeof logInSchema>;

export type LoginIdentifier =
  | { kind: 'email'; email: string }
  | { kind: 'username'; username: string };

/**
 * What /login signs in with. A username can never hold an "@", so one past the first character means
 * an email; a leading "@" is how people write a username ("@mira.k").
 */
export function parseLoginIdentifier(raw: string): LoginIdentifier {
  const value = raw.trim();
  if (value.startsWith('@')) return { kind: 'username', username: value.slice(1).toLowerCase() };
  if (value.includes('@')) return { kind: 'email', email: value.toLowerCase() };
  return { kind: 'username', username: value.toLowerCase() };
}

export const otpCodeSchema = z
  .string()
  .trim()
  .regex(new RegExp(`^\\d{${LIMITS.otp.length}}$`), `Enter the ${LIMITS.otp.length}-digit code`);

/** /verify-otp: confirms the email of a new account. */
export const verifyOtpSchema = z.object({
  email: emailSchema,
  otp: otpCodeSchema,
});
export type VerifyOtpInput = z.input<typeof verifyOtpSchema>;

/** POST /api/demo/session */
export const demoSessionSchema = z.object({
  as: z.enum(['creator', 'fan']),
});
export type DemoSessionInput = z.input<typeof demoSessionSchema>;

/** Only same-site relative paths are allowed as a post-sign-in destination. */
export function isSafeReturnTo(value: string | null | undefined): value is string {
  if (!value) return false;
  return value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/\\');
}

export const returnToSchema = z
  .string()
  .max(2048)
  .refine((value) => isSafeReturnTo(value), 'Invalid return path');
