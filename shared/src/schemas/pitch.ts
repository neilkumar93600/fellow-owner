import { z } from 'zod';
import { INBOX_SORTS, INBOX_TABS, PITCH_STATUSES, PITCH_TYPES } from '../enums.js';
import { LIMITS } from '../limits.js';
import { cursorQuerySchema, linkSchema } from './space.js';

const P = LIMITS.pitch;

/** POST /api/spaces/:handle/pitches */
export const createPitchSchema = z.object({
  type: z.enum(PITCH_TYPES),
  subject: z
    .string()
    .trim()
    .min(P.subject.min, `At least ${P.subject.min} characters`)
    .max(P.subject.max, `Up to ${P.subject.max} characters`),
  body: z
    .string()
    .trim()
    .min(P.body.min, `At least ${P.body.min} characters`)
    .max(P.body.max, `Up to ${P.body.max} characters`),
  links: z.array(linkSchema).max(P.links.max, `Up to ${P.links.max} links`),
});
export type CreatePitchInput = z.input<typeof createPitchSchema>;

/** PATCH /api/pitches/:id: the sender withdraws while status is `new`. */
export const withdrawPitchSchema = z.object({
  status: z.literal('withdrawn'),
});
export type WithdrawPitchInput = z.input<typeof withdrawPitchSchema>;

export const pitchReplySchema = z
  .string()
  .trim()
  .min(P.reply.min, 'Write a reply')
  .max(P.reply.max, `Up to ${P.reply.max} characters`);

/** PATCH /api/studio/inbox/:id: the creator acts on a pitch. */
export const studioPitchActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('set_status'),
    status: z.enum(['new', 'shortlisted', 'archived']),
  }),
  /** Moves a filtered (spam-flagged) pitch back to All. */
  z.object({ action: z.literal('restore') }),
  /** Sets status `replied`; the sender sees the reply in My space. */
  z.object({ action: z.literal('reply'), reply: pitchReplySchema }),
  /** Re-runs triage against the current taste profile. */
  z.object({ action: z.literal('rescore') }),
]);
export type StudioPitchAction = z.input<typeof studioPitchActionSchema>;

/** GET /api/studio/inbox */
export const inboxQuerySchema = cursorQuerySchema.extend({
  tab: z.enum(INBOX_TABS).default('all'),
  sort: z.enum(INBOX_SORTS).default('fit'),
  status: z.enum(PITCH_STATUSES).optional(),
  q: z.string().trim().max(LIMITS.search.queryMax).optional(),
  /** Today: leave out pitches snoozed with Later. */
  hideSnoozed: z.stringbool().optional(),
});
export type InboxQuery = z.output<typeof inboxQuerySchema>;
