import { z } from 'zod';
import { LIMITS } from '../limits.js';

/**
 * POST /api/spaces/:handle/coach (F30 Idea Coach): a draft pitch or post, checked for clarity.
 * Body max is the longest draft either form accepts (a post body).
 */
export const coachRequestSchema = z.object({
  kind: z.enum(['pitch', 'post']),
  subject: z.string().trim().max(200).default(''),
  body: z
    .string()
    .trim()
    .min(LIMITS.coach.minBodyChars, `Write at least ${LIMITS.coach.minBodyChars} characters`)
    .max(LIMITS.post.body.max),
});
export type CoachRequestInput = z.input<typeof coachRequestSchema>;
