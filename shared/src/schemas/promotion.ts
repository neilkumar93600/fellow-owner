import { z } from 'zod';
import { CLICK_PLATFORMS, PROMOTION_PLATFORMS, type PromotionPlatform } from '../enums.js';
import { LIMITS } from '../limits.js';
import { idSchema } from './space.js';

const P = LIMITS.promotion;

const hashtagsSchema = z
  .array(
    z
      .string()
      .trim()
      .min(1)
      .max(P.hashtags.itemMax)
      .transform((tag) => tag.replace(/^#+/, '')),
  )
  .max(P.hashtags.max, `Up to ${P.hashtags.max} hashtags`);

function draftSchemaFor(platform: PromotionPlatform) {
  return z.object({
    text: z
      .string()
      .max(P.text[platform], `Up to ${P.text[platform]} characters on this platform`),
    hashtags: hashtagsSchema,
  });
}

export const promotionDraftsSchema = z.object({
  x: draftSchemaFor('x').optional(),
  instagram: draftSchemaFor('instagram').optional(),
  linkedin: draftSchemaFor('linkedin').optional(),
  youtube: draftSchemaFor('youtube').optional(),
});
export type PromotionDraftsInput = z.input<typeof promotionDraftsSchema>;

/** POST /api/studio/promotions: create a draft promotion and generate drafts with the AI. */
export const createPromotionSchema = z.object({ postId: idSchema });
export type CreatePromotionInput = z.input<typeof createPromotionSchema>;

/** PATCH /api/studio/promotions/:id */
export const promotionActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('save'),
    headline: z
      .string()
      .trim()
      .max(P.headline.max, `Up to ${P.headline.max} characters`)
      .nullable()
      .optional(),
    drafts: promotionDraftsSchema,
  }),
  /** Requires at least one non-empty draft. Creates the showcase slug and short code. */
  z.object({ action: z.literal('publish') }),
  /** Removes the showcase; the short link then shows "No longer featured". */
  z.object({ action: z.literal('unpublish') }),
  /** Re-runs the AI for some platforms (all when omitted). */
  z.object({
    action: z.literal('regenerate'),
    platforms: z.array(z.enum(PROMOTION_PLATFORMS)).min(1).optional(),
  }),
]);
export type PromotionAction = z.input<typeof promotionActionSchema>;

/** GET /r/:code?p=x */
export const shortLinkParamsSchema = z.object({
  code: z.string().trim().min(1).max(32),
});
export const shortLinkQuerySchema = z.object({
  p: z.enum(CLICK_PLATFORMS).catch('other').default('other'),
});

/** GET /api/spaces/:handle/showcase/:slug */
export const showcaseParamsSchema = z.object({
  handle: z.string().trim().toLowerCase().min(1).max(LIMITS.handle.max),
  slug: z.string().trim().toLowerCase().min(1).max(160),
});

/** GET /api/studio/promotions/post/:postId */
export const promotionPostParamsSchema = z.object({ postId: idSchema });

/** True when at least one draft has text to publish. */
export function hasPublishableDraft(drafts: PromotionDraftsInput | null | undefined): boolean {
  if (!drafts) return false;
  return PROMOTION_PLATFORMS.some((platform) => (drafts[platform]?.text ?? '').trim().length > 0);
}
