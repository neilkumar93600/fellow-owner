import { z } from 'zod';
import { PLATFORMS, type Platform } from './enums.js';
import { cursorQuerySchema } from './schemas/space.js';
import type { ISODate, Page } from './types.js';

// F1 Post performance and F2 Profile score (creator only, /api/spaces/:handle/...).
// The numbers come from the daily refresh of each linked profile (tick `refresh_performance`):
// one follower snapshot per profile per day (platform_snapshots) and the recent posts with their
// public metrics (platform_posts). Sample numbers are labelled (`source: 'sample'`, `hasSample`),
// never mixed in silently. The score is computed in code from data: deterministic and explained.

/** Windows the Performance page offers, in days. */
export const PERFORMANCE_WINDOWS = [7, 30, 90] as const;
export type PerformanceWindow = (typeof PERFORMANCE_WINDOWS)[number];

/** Where a number came from: a live fetch, the creator's own count, or labelled sample data. */
export const METRIC_SOURCES = ['live', 'manual', 'sample'] as const;
export type MetricSource = (typeof METRIC_SOURCES)[number];

/** GET .../performance/posts?sort= */
export const PERFORMANCE_POST_SORTS = ['recent', 'views', 'engagement'] as const;
export type PerformancePostSort = (typeof PERFORMANCE_POST_SORTS)[number];

/** Where best days and hours come from: the creator's own dated posts, or general defaults (labelled). */
export const BEST_TIME_BASES = ['your_posts', 'defaults'] as const;
export type BestTimeBasis = (typeof BEST_TIME_BASES)[number];

export const PERFORMANCE_LIMITS = {
  /** Profiles the daily refresh fetches per run (bounded Apify spend, like refresh_followers). */
  refreshProfilesPerRun: 50,
  /** Recent posts kept per profile per refresh (the lookup returns at most 10). */
  postsPerProfile: 10,
  /** Snapshots and posts older than this are purged. */
  retentionDays: 400,
  /** Top posts on the Performance page and in the media kit. */
  topPosts: 5,
  /** Fewer dated posts than this: best times fall back to labelled defaults. */
  bestTimesMinPosts: 5,
  /** Best day/hour cells in the summary. */
  bestTimeCells: 3,
  /** Stored post titles and captions are cut to this. */
  postTitleMax: 300,
} as const;

/** The five parts of the 0-100 profile score (F2). */
export const PROFILE_SCORE_PARTS = [
  'completeness',
  'reach',
  'engagement',
  'consistency',
  'community',
] as const;
export type ProfileScorePart = (typeof PROFILE_SCORE_PARTS)[number];

export const PROFILE_SCORE_LABELS: Record<ProfileScorePart, string> = {
  completeness: 'Profile',
  reach: 'Reach',
  engagement: 'Engagement',
  consistency: 'Posting rhythm',
  community: 'Community health',
};

/** Tips every score comes with. */
export const PROFILE_SCORE_TIP_COUNT = 3;

// ---------------------------------------------------------------- request schemas

/**
 * An IANA time zone from the browser (Intl.DateTimeFormat().resolvedOptions().timeZone), for day
 * and hour buckets. A loose shape check; the API falls back to UTC for a zone it does not know.
 */
export const timeZoneSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z][A-Za-z0-9_+\-/]*$/, 'Unknown time zone');

/** GET /api/spaces/:handle/performance?days=7|30|90&tz= (default 30 days, UTC). */
export const performanceQuerySchema = z.object({
  days: z.coerce.number().pipe(z.literal(PERFORMANCE_WINDOWS, 'Use 7, 30 or 90')).default(30),
  tz: timeZoneSchema.optional(),
});
export type PerformanceQuery = z.output<typeof performanceQuerySchema>;

/** GET /api/spaces/:handle/performance/posts */
export const performancePostsQuerySchema = cursorQuerySchema.extend({
  platform: z.enum(PLATFORMS).optional(),
  sort: z.enum(PERFORMANCE_POST_SORTS).default('recent'),
});
export type PerformancePostsQuery = z.output<typeof performancePostsQuerySchema>;

// ---------------------------------------------------------------- responses

/** One day of a profile's followers (`day` is YYYY-MM-DD, UTC). */
export interface FollowerPoint {
  day: string;
  followers: number;
}

/** One linked profile over the window. */
export interface PlatformPerformance {
  platform: Platform;
  handle: string | null;
  url: string;
  followers: number;
  /** Followers gained over the window; null without a snapshot at its start. */
  growth: number | null;
  /** Percent change over the window; null without a start value. */
  growthPct: number | null;
  /** (likes + comments) / views of the window's posts, 0..1; null without views. */
  engagementRate: number | null;
  postsInWindow: number;
  source: MetricSource;
  /** Oldest first, one point per day with a snapshot. */
  series: FollowerPoint[];
  fetchedAt: ISODate | null;
}

/** A post on a linked platform with its public metrics. */
export interface PerformancePost {
  id: string;
  platform: Platform;
  url: string;
  title: string;
  postedAt: ISODate | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  /** (likes + comments) / views, 0..1; null without views. */
  engagementRate: number | null;
  source: MetricSource;
  fetchedAt: ISODate;
}

/** A good day and hour to post, in the requested time zone (weekday 0 = Sunday). */
export interface BestTimeCell {
  weekday: number;
  hour: number;
  /** Relative strength, 0..1 (the best cell is 1). */
  score: number;
}

/** GET /api/spaces/:handle/performance */
export interface PerformanceSummary {
  days: PerformanceWindow;
  /** The zone the day and hour buckets use (UTC when none was given or it was unknown). */
  tz: string;
  from: ISODate;
  to: ISODate;
  totals: {
    followers: number;
    growth: number | null;
    growthPct: number | null;
    engagementRate: number | null;
    posts: number;
  };
  platforms: PlatformPerformance[];
  /** Best first, at most PERFORMANCE_LIMITS.topPosts. */
  topPosts: PerformancePost[];
  bestTimes: { basedOn: BestTimeBasis; cells: BestTimeCell[] };
  /** Daily totals across profiles for the trend chart, oldest first. */
  trend: Array<{ day: string; followers: number; engagementRate: number | null }>;
  /** True when any number here is sample data (the page labels it). */
  hasSample: boolean;
  /** The last refresh of any profile; null before the first one. */
  refreshedAt: ISODate | null;
}

/** GET /api/spaces/:handle/performance/posts */
export interface PerformancePostsPage extends Page<PerformancePost> {
  total: number;
}

/** One part of the profile score, explained in one plain sentence. */
export interface ProfileScoreItem {
  part: ProfileScorePart;
  label: string;
  points: number;
  max: number;
  explanation: string;
}

/** A concrete next step that would raise the score. */
export interface ProfileScoreTip {
  part: ProfileScorePart;
  text: string;
  /** A dashboard path that helps, e.g. /dashboard/settings; null when there is none. */
  href: string | null;
}

/** GET /api/spaces/:handle/profile-score: 0-100, computed in code from data (deterministic). */
export interface ProfileScore {
  score: number;
  /** One item per PROFILE_SCORE_PARTS entry, in that order; the points sum to `score`. */
  breakdown: ProfileScoreItem[];
  /** Exactly PROFILE_SCORE_TIP_COUNT tips, most valuable first. */
  tips: ProfileScoreTip[];
  computedAt: ISODate;
  hasSample: boolean;
}
