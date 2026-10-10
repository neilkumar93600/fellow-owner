import { z } from 'zod';
import { PLATFORMS } from '../enums.js';
import { LIMITS } from '../limits.js';
import { emailSchema } from './auth.js';
import { cursorQuerySchema, idSchema } from './space.js';

const F = LIMITS.follower;

export const followerNameSchema = z
  .string()
  .trim()
  .min(F.name.min, 'Add a name')
  .max(F.name.max, `Up to ${F.name.max} characters`);

/** "@mira.k" and "mira.k" are the same handle: the @ is dropped before it is checked and stored. */
export const followerHandleSchema = z
  .string()
  .trim()
  .transform((handle) => handle.replace(/^@+/, ''))
  .pipe(
    z
      .string()
      .min(1, 'Add a handle')
      .max(F.handle.max, `Up to ${F.handle.max} characters`)
      .regex(LIMITS.socialHandle.pattern, 'Use letters, numbers, periods, underscores and hyphens'),
  );

export const followerNoteSchema = z
  .string()
  .trim()
  .max(F.note.max, `Up to ${F.note.max} characters`);

const followerCommunityIdsSchema = z
  .array(idSchema)
  .max(F.communitiesPerFollower, `Up to ${F.communitiesPerFollower} communities`)
  .transform((ids) => [...new Set(ids)]);

/** POST /api/studio/followers: add one by hand. 409 on a duplicate email or platform + handle. */
export const createFollowerSchema = z.object({
  name: followerNameSchema,
  handle: followerHandleSchema.optional(),
  platform: z.enum(PLATFORMS).optional(),
  email: emailSchema.optional(),
  note: followerNoteSchema.optional(),
  communityIds: followerCommunityIdsSchema.optional(),
});
export type CreateFollowerInput = z.input<typeof createFollowerSchema>;

/** PATCH /api/studio/followers/:id. null clears a field; `communityIds` replaces the tag set. */
export const updateFollowerSchema = z
  .object({
    name: followerNameSchema.optional(),
    handle: followerHandleSchema.nullable().optional(),
    platform: z.enum(PLATFORMS).nullable().optional(),
    email: emailSchema.nullable().optional(),
    note: followerNoteSchema.nullable().optional(),
    communityIds: followerCommunityIdsSchema.optional(),
  })
  .refine((value) => Object.values(value).some((v) => v !== undefined), {
    message: 'Nothing to update',
  });
export type UpdateFollowerInput = z.input<typeof updateFollowerSchema>;

/** GET /api/studio/followers. `community` is a slug or `untagged`; `joined` filters by membership. */
export const followersQuerySchema = cursorQuerySchema.extend({
  q: z.string().trim().max(LIMITS.search.queryMax).optional(),
  community: z.string().trim().toLowerCase().max(LIMITS.community.slug.max).optional(),
  joined: z.enum(['yes', 'no']).optional(),
});
export type FollowersQuery = z.output<typeof followersQuerySchema>;

/** POST /api/studio/followers/import: CSV (header row required) or pasted lines. */
export const importFollowersSchema = z.object({
  source: z.enum(['csv', 'paste']),
  // Not trimmed: error line numbers are physical lines of the text as submitted.
  text: z
    .string()
    .max(F.importChars, `Up to ${F.importChars.toLocaleString('en-US')} characters`)
    .refine((text) => text.trim() !== '', 'Paste or upload your followers'),
  /** Ask the AI for community suggestions from the notes (default true). */
  suggest: z.boolean().default(true),
});
export type ImportFollowersInput = z.input<typeof importFollowersSchema>;

const followerIdsSchema = z
  .array(idSchema)
  .max(F.bulkMax, `Up to ${F.bulkMax} followers at a time`)
  .transform((ids) => [...new Set(ids)]);

/** POST /api/studio/followers/tag: add or remove one community on many followers. */
export const tagFollowersSchema = z.object({
  followerIds: z
    .array(idSchema)
    .min(1, 'Pick at least one follower')
    .max(F.bulkMax, `Up to ${F.bulkMax} followers at a time`)
    .transform((ids) => [...new Set(ids)]),
  communityId: idSchema,
  action: z.enum(['add', 'remove']),
});
export type TagFollowersInput = z.input<typeof tagFollowersSchema>;

/** POST /api/studio/followers/auto-tag: AI tags from notes. No ids = every untagged follower. */
export const autoTagFollowersSchema = z.object({
  followerIds: followerIdsSchema.optional(),
});
export type AutoTagFollowersInput = z.input<typeof autoTagFollowersSchema>;
