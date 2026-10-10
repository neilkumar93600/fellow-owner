import { z } from 'zod';
import { LIMITS } from '../limits.js';
import { postBodySchema, postLinksSchema, postTitleSchema } from './post.js';
import { idSchema } from './space.js';

/** POST /api/studio/challenges. The service checks that dueAt is in the future. */
export const createChallengeSchema = z.object({
  title: z.string().trim().min(LIMITS.post.title.min).max(LIMITS.post.title.max),
  body: z.string().trim().max(2000).optional(),
  /** Null = all communities. */
  communityId: idSchema.nullable(),
  dueAt: z.iso.datetime(),
});
export type CreateChallengeInput = z.input<typeof createChallengeSchema>;

export const challengeParamsSchema = z.object({ id: idSchema });

/** POST /api/studio/challenges/:id/winner: must be an entry of this challenge. */
export const challengeWinnerSchema = z.object({ postId: idSchema });
export type ChallengeWinnerInput = z.input<typeof challengeWinnerSchema>;

/** POST /api/spaces/:handle/challenges/:id/entries: a fan entry, stored as an `idea` post. */
export const challengeEntrySchema = z.object({
  title: postTitleSchema,
  body: postBodySchema,
  links: postLinksSchema.default([]),
});
export type ChallengeEntryInput = z.input<typeof challengeEntrySchema>;
