import { z } from 'zod';
import { SUPPORT_KINDS } from '../enums.js';
import { LIMITS } from '../limits.js';

const S = LIMITS.support;

/**
 * POST /api/support/requests (contact + privacy forms). `website` is a honeypot: the form keeps it
 * empty; the service silently drops a request that fills it (same 202, so bots learn nothing).
 */
export const supportRequestSchema = z.object({
  kind: z.enum(SUPPORT_KINDS),
  name: z.string().trim().max(S.nameMax, `Up to ${S.nameMax} characters`).optional(),
  // Trim before the format check (auth's emailSchema checks first, so " a@b.co" fails there).
  email: z.string().trim().toLowerCase().pipe(z.email('Enter a valid email').max(254)),
  message: z
    .string()
    .trim()
    .min(S.messageMin, `Write at least ${S.messageMin} characters`)
    .max(S.messageMax, `Up to ${S.messageMax} characters`),
  website: z.string().max(500).optional(),
});
export type SupportRequestInput = z.input<typeof supportRequestSchema>;
