import { z } from 'zod';
import { COMMUNITY_ICONS, PLATFORMS, TINTS } from '../enums.js';
import { LIMITS } from '../limits.js';
import { isReservedHandle } from '../reserved-handles.js';
import { tasteProfileSchema } from './taste-profile.js';

// Primitives used across every space-scoped schema live here, since the space is the root entity.

/** uuid primary keys (gen_random_uuid). */
export const idSchema = z.guid('Invalid id');

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export const httpUrlSchema = z
  .string()
  .trim()
  .min(1, 'Add a link')
  .max(LIMITS.link.urlMax, 'Link is too long')
  .refine(isHttpUrl, 'Links must start with http:// or https://');

export const linkSchema = z.object({
  label: z
    .string()
    .trim()
    .min(1, 'Add a label')
    .max(LIMITS.link.labelMax, `Up to ${LIMITS.link.labelMax} characters`),
  url: httpUrlSchema,
});
export type LinkInput = z.input<typeof linkSchema>;

/** Cursor pagination on (created_at, id). The cursor is opaque to clients. */
export const cursorQuerySchema = z.object({
  cursor: z.string().trim().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(LIMITS.pagination.maxPageSize).optional(),
});

export const idParamsSchema = z.object({ id: idSchema });

export const handleSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(LIMITS.handle.min, `At least ${LIMITS.handle.min} characters`)
  .max(LIMITS.handle.max, `Up to ${LIMITS.handle.max} characters`)
  .regex(LIMITS.handle.pattern, 'Use lowercase letters, numbers, _ and .')
  .refine((handle) => !isReservedHandle(handle), 'This handle is reserved');

/** Route params on /api/spaces/:handle/*. Looser than handleSchema: lookups 404 instead of 400. */
export const handleParamsSchema = z.object({
  handle: z.string().trim().toLowerCase().min(1).max(LIMITS.handle.max),
});

export const handleCheckQuerySchema = z.object({
  handle: z.string().trim().toLowerCase().max(LIMITS.handle.max),
});

export const platformEntrySchema = z.object({
  platform: z.enum(PLATFORMS),
  url: httpUrlSchema,
  /** The handle the link was parsed to (set by the profile lookup). */
  handle: z.string().trim().min(1).max(100).optional(),
  /** When `followers` was last fetched (ISO); the daily refresh goes oldest first. */
  fetchedAt: z.iso.datetime().optional(),
  followers: z
    .number({ error: 'Enter a number' })
    .int('Whole numbers only')
    .min(0)
    .max(2_000_000_000),
});
export type PlatformEntryInput = z.input<typeof platformEntrySchema>;

/** ~350KB of base64: the avatar the setup suggestions download (up to 256KB of image bytes). */
const AVATAR_DATA_URL_MAX = 350_000;
const AVATAR_DATA_URL = /^data:image\/(?:jpeg|png|webp|gif|avif);base64,[A-Za-z0-9+/]+={0,2}$/;

/** An http(s) link or a same-site path: /api/media/<key> (uploads) or /demo/mira.jpg. */
function isImageLink(value: string): boolean {
  return (
    value.length <= LIMITS.link.urlMax &&
    (isHttpUrl(value) || (/^\/(?!\/)[^\s\\]*$/.test(value) && !value.includes('..')))
  );
}

/** An http(s) link, a site path (/api/media/..., /demo/mira.jpg), or a small base64 image. */
export const avatarUrlSchema = z
  .string()
  .trim()
  .refine(
    (value) =>
      value.startsWith('data:')
        ? value.length <= AVATAR_DATA_URL_MAX && AVATAR_DATA_URL.test(value)
        : isImageLink(value),
    'Use an image link or upload a small picture',
  );

/** A cover image (space or community): an uploaded /api/media/<key> path or an http(s) link. */
export const coverUrlSchema = z
  .string()
  .trim()
  .refine(isImageLink, 'Upload an image or use an image link');

export const displayNameSchema = z
  .string()
  .trim()
  .min(LIMITS.space.displayName.min, 'Add your name')
  .max(LIMITS.space.displayName.max, `Up to ${LIMITS.space.displayName.max} characters`);

export const spaceProfileSchema = z.object({
  displayName: displayNameSchema,
  bio: z
    .string()
    .trim()
    .max(LIMITS.space.bio.max, `Up to ${LIMITS.space.bio.max} characters`)
    .nullable()
    .optional(),
  avatarUrl: avatarUrlSchema.nullable().optional(),
  coverUrl: coverUrlSchema.nullable().optional(),
  platforms: z
    .array(platformEntrySchema)
    .max(LIMITS.space.platforms.max, `Up to ${LIMITS.space.platforms.max} platforms`),
});
export type SpaceProfileInput = z.input<typeof spaceProfileSchema>;

export const onboardingCommunitySchema = z.object({
  name: z
    .string()
    .trim()
    .min(LIMITS.community.name.min, 'Name the community')
    .max(LIMITS.community.name.max, `Up to ${LIMITS.community.name.max} characters`),
  description: z
    .string()
    .trim()
    .max(LIMITS.community.description.max, `Up to ${LIMITS.community.description.max} characters`)
    .optional(),
  tint: z.enum(TINTS),
  icon: z.enum(COMMUNITY_ICONS),
});
export type OnboardingCommunityInput = z.input<typeof onboardingCommunitySchema>;

/** POST /api/studio/space: finish onboarding. Creates the space and the owner membership. */
export const createSpaceSchema = z.object({
  handle: handleSchema,
  displayName: displayNameSchema,
  bio: spaceProfileSchema.shape.bio,
  avatarUrl: avatarUrlSchema.optional(),
  platforms: spaceProfileSchema.shape.platforms,
  communities: z
    .array(onboardingCommunitySchema)
    .min(1, 'Add at least one community')
    .max(LIMITS.community.perSpace.max),
  tasteProfile: tasteProfileSchema,
});
export type CreateSpaceInput = z.input<typeof createSpaceSchema>;

/** PUT /api/studio/settings. Send any part. `showReadReceipts`: fans see when a pitch was read (F31). */
export const updateSettingsSchema = z
  .object({
    profile: spaceProfileSchema.optional(),
    tasteProfile: tasteProfileSchema.optional(),
    showReadReceipts: z.boolean().optional(),
  })
  .refine((value) => Object.values(value).some((v) => v !== undefined), {
    message: 'Nothing to save',
  });
export type UpdateSettingsInput = z.input<typeof updateSettingsSchema>;
