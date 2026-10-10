import {
  createAccountSchema,
  emailSchema,
  logInSchema,
  passwordSchema,
  socialHandleSchema,
  socialPlatformSchema,
  usernameSchema,
} from '@fellow-owners/shared';
import { z } from 'zod';

/**
 * The shared schemas, with additions for the forms: an empty field asks for a value ("Enter your
 * email") instead of calling nothing invalid. Format checks and their messages stay the shared ones.
 */
export const requiredEmail = z.string().trim().min(1, 'Enter your email').pipe(emailSchema);

/** One field takes a handle or an email (spec §11 calls the username a handle everywhere people see it). */
export const loginFormSchema = logInSchema.extend({
  identifier: z.string().trim().min(1, 'Enter your handle or email').max(254),
});
export type LoginFormValues = z.input<typeof loginFormSchema>;

export const emailFormSchema = z.object({ email: requiredEmail });
export type EmailFormValues = z.input<typeof emailFormSchema>;

/** The social profile is optional: an empty handle is fine, and a typed one follows the shared rules. */
const optionalHandle = z
  .string()
  .transform((value) => value.trim().replace(/^@+/, ''))
  .pipe(z.union([z.literal(''), socialHandleSchema]));

/**
 * Only compare once both passwords are strings and the second one has been typed, so the match error
 * shows even while another field still has its own (Zod skips object refinements otherwise).
 */
function bothPasswordsTyped(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false;
  const { password, confirmPassword } = value as Record<string, unknown>;
  return (
    typeof password === 'string' && typeof confirmPassword === 'string' && confirmPassword !== ''
  );
}

export const createAccountFormSchema = createAccountSchema
  .extend({
    email: requiredEmail,
    username: z.string().trim().min(1, 'Choose a handle').pipe(usernameSchema),
    socialPlatform: socialPlatformSchema,
    socialHandle: optionalHandle,
    password: z.string().min(1, 'Choose a password').pipe(passwordSchema),
    confirmPassword: z.string().min(1, 'Type your password again'),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords don’t match',
    when: (payload) => bothPasswordsTyped(payload.value),
  });
export type CreateAccountFormInput = z.input<typeof createAccountFormSchema>;
export type CreateAccountFormValues = z.output<typeof createAccountFormSchema>;
