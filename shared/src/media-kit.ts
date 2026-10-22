import { z } from 'zod';
import type { Platform } from './enums.js';
import type { PerformancePost } from './performance.js';
import type { ISODate, PublicSpace } from './types.js';

// F6 Media kit (public, for brands): /{handle}/media-kit, generated from the F1/F2 numbers (reach,
// engagement, top posts) plus what the creator sets in Settings (audience note, rates). Off until
// the creator turns it on (spaces.media_kit_enabled); the public read is 404 while it is off.

export const MEDIA_KIT_LIMITS = {
  rates: { max: 8 },
  rateLabel: { min: 1, max: 60 },
  ratePrice: { min: 1, max: 40 },
  note: { max: 600 },
  topPosts: 3,
} as const;

const M = MEDIA_KIT_LIMITS;

/** A deliverable and its price as the creator writes it ("Instagram Reel", "from $800"). */
export const mediaKitRateSchema = z.object({
  label: z
    .string()
    .trim()
    .min(M.rateLabel.min, 'Name the deliverable')
    .max(M.rateLabel.max, `Up to ${M.rateLabel.max} characters`),
  price: z
    .string()
    .trim()
    .min(M.ratePrice.min, 'Add a price')
    .max(M.ratePrice.max, `Up to ${M.ratePrice.max} characters`),
});
export type MediaKitRate = z.output<typeof mediaKitRateSchema>;

/** PATCH /api/spaces/:handle/media-kit (owner): any part; a null note clears it. */
export const updateMediaKitSchema = z
  .object({
    enabled: z.boolean().optional(),
    rates: z.array(mediaKitRateSchema).max(M.rates.max, `Up to ${M.rates.max} rates`).optional(),
    note: z.string().trim().max(M.note.max, `Up to ${M.note.max} characters`).nullable().optional(),
  })
  .refine((value) => Object.values(value).some((v) => v !== undefined), {
    message: 'Nothing to save',
  });
export type UpdateMediaKitInput = z.input<typeof updateMediaKitSchema>;

/** The creator's media kit settings (spaces.media_kit_*). */
export interface MediaKitSettings {
  enabled: boolean;
  rates: MediaKitRate[];
  /** The audience note shown to brands. */
  note: string | null;
  /** The public page, e.g. /mira/media-kit (live once enabled). */
  path: string;
}

/** GET /api/spaces/:handle/media-kit (public, 404 while off) and .../media-kit/preview (owner). */
export interface MediaKit {
  space: Pick<
    PublicSpace,
    'handle' | 'displayName' | 'bio' | 'avatarUrl' | 'coverUrl' | 'totalFollowers'
  >;
  reach: Array<{
    platform: Platform;
    handle: string | null;
    url: string;
    followers: number;
    /** Percent change over the last 30 days; null without a start value. */
    growthPct: number | null;
  }>;
  /** (likes + comments) / views of the last 30 days' posts, 0..1; null without views. */
  engagementRate: number | null;
  /** At most MEDIA_KIT_LIMITS.topPosts. */
  topPosts: PerformancePost[];
  audienceNote: string | null;
  rates: MediaKitRate[];
  /** The public work-with-me form, e.g. /mira/work-with-me. */
  workWithMePath: string;
  /** True when any number here is sample data (the page labels it). */
  hasSample: boolean;
  /** The last refresh of the numbers; null before the first one. */
  updatedAt: ISODate | null;
}
