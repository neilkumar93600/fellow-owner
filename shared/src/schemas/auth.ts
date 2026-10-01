import { z } from 'zod';
import { LIMITS } from '../limits.js';

export const emailSchema = z.email('Enter a valid email').trim().toLowerCase().max(254);

/** /login: email, then a 6-digit code is sent. */
export const signInSchema = z.object({ email: emailSchema });
export type SignInInput = z.input<typeof signInSchema>;

/** /sign-up: name + email, then the same code step as sign in. */
export const signUpSchema = z.object({
  name: z
    .string()
    .trim()
    .min(LIMITS.membership.name.min, 'Add your name')
    .max(LIMITS.membership.name.max, `Up to ${LIMITS.membership.name.max} characters`),
  email: emailSchema,
});
export type SignUpInput = z.input<typeof signUpSchema>;

export const otpCodeSchema = z
  .string()
  .trim()
  .regex(new RegExp(`^\\d{${LIMITS.otp.length}}$`), `Enter the ${LIMITS.otp.length}-digit code`);

/** /verify-otp */
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
