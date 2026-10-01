import { z } from 'zod';
import { POST_STATUSES, POST_TYPES, SIGNAL_KINDS } from '../enums.js';
import { LIMITS } from '../limits.js';
import { cursorQuerySchema, idSchema, linkSchema } from './space.js';

const P = LIMITS.post;

export const postTitleSchema = z
  .string()
  .trim()
  .min(P.title.min, `At least ${P.title.min} characters`)
  .max(P.title.max, `Up to ${P.title.max} characters`);

export const postBodySchema = z
  .string()
  .trim()
  .min(P.body.min, `At least ${P.body.min} characters`)
  .max(P.body.max, `Up to ${P.body.max} characters`);

export const roleSchema = z
  .string()
  .trim()
  .min(P.rolesNeeded.itemMin, `At least ${P.rolesNeeded.itemMin} characters`)
  .max(P.rolesNeeded.itemMax, `Up to ${P.rolesNeeded.itemMax} characters`);

export const rolesNeededSchema = z
  .array(roleSchema)
  .max(P.rolesNeeded.max, `Up to ${P.rolesNeeded.max} roles`);

export const postLinksSchema = z.array(linkSchema).max(P.links.max, `Up to ${P.links.max} links`);

/** POST /api/spaces/:handle/posts. Only projects list roles (only projects have teams). */
export const createPostSchema = z
  .object({
    communityId: idSchema,
    type: z.enum(POST_TYPES),
    title: postTitleSchema,
    body: postBodySchema,
    rolesNeeded: rolesNeededSchema,
    links: postLinksSchema,
  })
  .refine((post) => post.type === 'project' || post.rolesNeeded.length === 0, {
    message: 'Only projects can list roles',
    path: ['rolesNeeded'],
  });
export type CreatePostInput = z.input<typeof createPostSchema>;

/** PATCH /api/posts/:id. Content edits only within 24 hours; status any time (author). */
export const updatePostSchema = z
  .object({
    title: postTitleSchema.optional(),
    body: postBodySchema.optional(),
    rolesNeeded: rolesNeededSchema.optional(),
    links: postLinksSchema.optional(),
    status: z.enum(POST_STATUSES).optional(),
  })
  .refine((value) => Object.values(value).some((v) => v !== undefined), {
    message: 'Nothing to update',
  });
export type UpdatePostInput = z.input<typeof updatePostSchema>;

/** GET /api/spaces/:handle/communities/:slug/posts */
export const feedQuerySchema = cursorQuerySchema.extend({
  type: z.enum(POST_TYPES).optional(),
});
export type FeedQuery = z.output<typeof feedQuerySchema>;

/** GET /api/studio/ideas: ranked by the idea score in 02-trd. */
export const ideasQuerySchema = cursorQuerySchema.extend({
  community: z.string().trim().toLowerCase().max(LIMITS.community.slug.max).optional(),
  type: z.enum(POST_TYPES).optional(),
  q: z.string().trim().max(LIMITS.search.queryMax).optional(),
});
export type IdeasQuery = z.output<typeof ideasQuerySchema>;

/** PATCH /api/studio/posts/:id */
export const studioPostActionSchema = z.object({
  action: z.enum(['hide', 'unhide', 'rescore']),
});
export type StudioPostAction = z.output<typeof studioPostActionSchema>;

/** PUT and DELETE /api/posts/:id/signals/:kind */
export const signalParamsSchema = z.object({
  id: idSchema,
  kind: z.enum(SIGNAL_KINDS),
});

/** POST /api/posts/:id/team: request a role on a project. */
export const teamRequestSchema = z.object({ role: roleSchema });
export type TeamRequestInput = z.input<typeof teamRequestSchema>;

/** PATCH /api/posts/:id/team/:membershipId: the project author decides. */
export const teamDecisionSchema = z.object({
  status: z.enum(['accepted', 'declined']),
});
export type TeamDecisionInput = z.input<typeof teamDecisionSchema>;

export const teamParamsSchema = z.object({
  id: idSchema,
  membershipId: idSchema,
});
