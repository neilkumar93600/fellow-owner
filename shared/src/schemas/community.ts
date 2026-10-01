import { z } from 'zod';
import { COMMUNITY_ICONS, TINTS } from '../enums.js';
import { LIMITS } from '../limits.js';
import { cursorQuerySchema, handleParamsSchema } from './space.js';

const C = LIMITS.community;

export const communitySlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(C.slug.min, `At least ${C.slug.min} characters`)
  .max(C.slug.max, `Up to ${C.slug.max} characters`)
  .regex(C.slug.pattern, 'Use lowercase words joined by dashes');

export const communityNameSchema = z
  .string()
  .trim()
  .min(C.name.min, 'Name the community')
  .max(C.name.max, `Up to ${C.name.max} characters`);

export const communityDescriptionSchema = z
  .string()
  .trim()
  .max(C.description.max, `Up to ${C.description.max} characters`);

/** POST /api/studio/communities. The slug is derived from the name when omitted. */
export const createCommunitySchema = z.object({
  name: communityNameSchema,
  slug: communitySlugSchema.optional(),
  description: communityDescriptionSchema.optional(),
  tint: z.enum(TINTS),
  icon: z.enum(COMMUNITY_ICONS),
});
export type CreateCommunityInput = z.input<typeof createCommunitySchema>;

/** PATCH /api/studio/communities/:id. `archived: true` archives, `false` restores. */
export const updateCommunitySchema = z
  .object({
    name: communityNameSchema.optional(),
    description: communityDescriptionSchema.nullable().optional(),
    tint: z.enum(TINTS).optional(),
    icon: z.enum(COMMUNITY_ICONS).optional(),
    sortOrder: z.number().int().min(0).max(1000).optional(),
    archived: z.boolean().optional(),
  })
  .refine((value) => Object.values(value).some((v) => v !== undefined), {
    message: 'Nothing to update',
  });
export type UpdateCommunityInput = z.input<typeof updateCommunitySchema>;

/** /api/spaces/:handle/communities/:slug/... */
export const communityParamsSchema = handleParamsSchema.extend({
  slug: z.string().trim().toLowerCase().min(1).max(C.slug.max),
});

/** /api/studio/communities/:slug */
export const studioCommunityParamsSchema = z.object({
  slug: z.string().trim().toLowerCase().min(1).max(C.slug.max),
});

export const communityDetailQuerySchema = cursorQuerySchema;
