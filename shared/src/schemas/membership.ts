import { z } from 'zod';
import { LIMITS } from '../limits.js';
import { cursorQuerySchema, idSchema, linkSchema } from './space.js';

const M = LIMITS.membership;

export const introSchema = z.string().trim().max(M.intro.max, `Up to ${M.intro.max} characters`);

export const headlineSchema = z
  .string()
  .trim()
  .max(M.headline.max, `Up to ${M.headline.max} characters`);

/** Skills are trimmed, lowercased and deduplicated. */
export const skillsSchema = z
  .array(
    z
      .string()
      .trim()
      .toLowerCase()
      .min(1, 'Remove empty skills')
      .max(M.skills.itemMax, `Up to ${M.skills.itemMax} characters each`),
  )
  .max(M.skills.max, `Up to ${M.skills.max} skills`)
  .transform((skills) => [...new Set(skills)]);

/** POST /api/spaces/:handle/suggest-communities (join step 2). */
export const suggestCommunitiesSchema = z.object({
  intro: introSchema.min(
    M.introMinForSuggestions,
    `Write at least ${M.introMinForSuggestions} characters`,
  ),
});
export type SuggestCommunitiesInput = z.input<typeof suggestCommunitiesSchema>;

/** POST /api/spaces/:handle/join (join step 2, Confirm). Creates the membership. */
export const joinSpaceSchema = z.object({
  intro: introSchema.optional(),
  communityIds: z
    .array(idSchema)
    .min(1, 'Pick at least one community')
    .max(LIMITS.community.perSpace.max),
});
export type JoinSpaceInput = z.input<typeof joinSpaceSchema>;

/**
 * PATCH /api/spaces/:handle/me: the member edits their own profile (join step 3, My space).
 * `communityIds` replaces the set of joined communities when present.
 */
export const updateMembershipSchema = z
  .object({
    headline: headlineSchema.nullable().optional(),
    intro: introSchema.nullable().optional(),
    skills: skillsSchema.optional(),
    links: z.array(linkSchema).max(M.links.max, `Up to ${M.links.max} links`).optional(),
    communityIds: z.array(idSchema).min(1).max(LIMITS.community.perSpace.max).optional(),
  })
  .refine((value) => Object.values(value).some((v) => v !== undefined), {
    message: 'Nothing to update',
  });
export type UpdateMembershipInput = z.input<typeof updateMembershipSchema>;

/** GET /api/studio/people */
export const peopleQuerySchema = cursorQuerySchema.extend({
  q: z.string().trim().max(LIMITS.search.queryMax).optional(),
  community: z.string().trim().toLowerCase().max(LIMITS.community.slug.max).optional(),
});
export type PeopleQuery = z.output<typeof peopleQuerySchema>;

export const membershipParamsSchema = z.object({ membershipId: idSchema });
