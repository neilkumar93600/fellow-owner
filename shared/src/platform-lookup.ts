import { z } from 'zod';
import type { CommunityIcon, Tint } from './enums.js';

// Platform auto-fetch (Round 4 spec §6): a creator pastes a public profile link in onboarding,
// POST /api/studio/platform-lookup returns the profile, and POST /api/studio/setup-suggestions
// turns the confirmed profiles into pre-filled name, bio, "What you love", voice and groups.

export const LOOKUP_PLATFORMS = ['instagram', 'tiktok', 'youtube', 'x'] as const;
export type LookupPlatform = (typeof LOOKUP_PLATFORMS)[number];

/** Recent posts per profile, and profiles per setup-suggestions call. */
export const PLATFORM_LOOKUP_LIMITS = {
  recentMax: 10,
  profilesMax: 4,
  /** Lookups per user per minute (429 rate_limited after). */
  lookupsPerMinute: 5,
  /** Setup-suggestion calls per user per UTC day (429 daily_cap_reached after). */
  suggestionsPerDay: 10,
} as const;

export interface PlatformRecentPost {
  title: string;
  url: string;
  views: number | null;
  likes: number | null;
  /** ISO timestamp. */
  postedAt: string | null;
}

export interface PlatformProfile {
  platform: LookupPlatform;
  handle: string;
  displayName: string | null;
  /** The platform's (expiring) CDN URL for previews, or a site path for demo fixtures. */
  avatarUrl: string | null;
  bio: string | null;
  followers: number | null;
  verified: boolean;
  profileUrl: string;
  /** Newest first, at most PLATFORM_LOOKUP_LIMITS.recentMax. */
  recent: PlatformRecentPost[];
  /** `simulated` means made-up sample data: the UI shows a "Sample data" chip. */
  source: 'apify' | 'fixture' | 'simulated';
  fetchedAt: string;
}

export type PlatformLookupFailure = 'private' | 'not_found' | 'unavailable' | 'unsupported';

export type PlatformLookupResult =
  | { status: 'ready'; profile: PlatformProfile }
  | { status: 'failed'; reason: PlatformLookupFailure };

export interface SetupDemand {
  count: number;
  of: number;
  /** "6 of your last 10 videos are budget trips", written in code from the counts. */
  label: string;
}

export interface SetupCommunitySuggestion {
  name: string;
  description: string;
  icon: CommunityIcon;
  tint: Tint;
  demand: SetupDemand | null;
}

export interface SetupSuggestions {
  displayName: string | null;
  /** A `data:image/...` URL fetched server-side from an allowlisted CDN, a site path, or null. */
  avatarUrl: string | null;
  bio: string | null;
  /** Feeds TasteProfile.promote. */
  loves: string[];
  /** Verbatim caption quotes; feeds TasteProfile.voice. */
  voice: string[];
  /** At most 4. */
  communities: SetupCommunitySuggestion[];
}

// ---------------------------------------------------------------- request bodies

/** POST /api/studio/platform-lookup. The URL is parsed server-side against a host allowlist. */
export const platformLookupSchema = z.object({
  url: z.string().trim().min(1, 'Paste a profile link').max(2048, 'Link is too long'),
});
export type PlatformLookupInput = z.input<typeof platformLookupSchema>;

const count = z.number().int().min(0).max(1e13).nullable();

export const platformRecentPostSchema = z.object({
  title: z.string().max(2200),
  url: z.string().max(2048),
  views: count,
  likes: count,
  postedAt: z.string().max(40).nullable(),
});

export const platformProfileSchema = z.object({
  platform: z.enum(LOOKUP_PLATFORMS),
  handle: z.string().trim().min(1).max(100),
  displayName: z.string().max(200).nullable(),
  avatarUrl: z.string().max(4096).nullable(),
  bio: z.string().max(1000).nullable(),
  followers: count,
  verified: z.boolean(),
  profileUrl: z.string().max(2048),
  recent: z.array(platformRecentPostSchema).max(PLATFORM_LOOKUP_LIMITS.recentMax),
  source: z.enum(['apify', 'fixture', 'simulated']),
  fetchedAt: z.string().max(40),
});

/** POST /api/studio/setup-suggestions: the profiles the creator chose to use. */
export const setupSuggestionsSchema = z.object({
  profiles: z.array(platformProfileSchema).min(1).max(PLATFORM_LOOKUP_LIMITS.profilesMax),
});
export type SetupSuggestionsInput = z.input<typeof setupSuggestionsSchema>;
