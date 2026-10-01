import { emailSchema, signInSchema, signUpSchema } from '@fellow-owners/shared';
import { z } from 'zod';

/**
 * The shared schemas, with one addition for the forms: an empty email asks for one ("Enter your email")
 * instead of calling nothing invalid. The format check and its message stay the shared emailSchema.
 */
const requiredEmail = z.string().trim().min(1, 'Enter your email').pipe(emailSchema);

export const loginFormSchema = signInSchema.extend({ email: requiredEmail });
export type LoginFormValues = z.input<typeof loginFormSchema>;

export const signUpFormSchema = signUpSchema.extend({ email: requiredEmail });
export type SignUpFormValues = z.input<typeof signUpFormSchema>;

export { requiredEmail };
