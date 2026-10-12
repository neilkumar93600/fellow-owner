import type {
  BestTimes,
  PerformancePostsPage,
  PerformancePostsQuery,
  PerformanceQuery,
  PerformanceSummary,
  Platform,
  ProfileScore,
} from '@fellow-owners/shared';
import type { CoreDeps } from '../container.js';
import type { SpaceRow } from '../db/schema/spaces.js';
import { notImplemented } from '../lib/errors.js';

export type PerformanceServiceDeps = Pick<CoreDeps, 'env' | 'repos' | 'logger'>;

/** What one daily refresh did (tick `refresh_performance`). */
export interface PerformanceRefreshResult {
  /** Profiles looked up. */
  checked: number;
  snapshots: number;
  posts: number;
  /** Why nothing ran, when nothing did. */
  skipped?: string;
}

/** Best posting times for the planner (F3) and the summary. */
export interface BestTimesOptions {
  /** Empty = every linked platform. */
  platforms?: Platform[];
  /** IANA zone for day/hour buckets (UTC when unknown). */
  tz?: string;
  /** Earliest slot (default: now). */
  after?: Date;
  /** Slots wanted (default PLANNER_LIMITS.bestTimesMax). */
  count?: number;
}

/**
 * F1 Post performance and F2 Profile score. Reads take the space (not an owner context) because the
 * public media kit (F6) and the planner (F3) reuse them. Wave A stubs: endpoint methods answer 501
 * until B1 lands; refreshDue is a no-op so the daily tick records `ok`.
 */
export function createPerformanceService(_deps: PerformanceServiceDeps) {
  return {
    /** GET /api/spaces/:handle/performance; the media kit reads it with { days: 30 }. */
    async summary(_space: SpaceRow, _query: PerformanceQuery): Promise<PerformanceSummary> {
      throw notImplemented('Performance');
    },

    /** GET /api/spaces/:handle/performance/posts */
    async posts(_space: SpaceRow, _query: PerformancePostsQuery): Promise<PerformancePostsPage> {
      throw notImplemented('Performance');
    },

    /** GET /api/spaces/:handle/profile-score (Today's compact card and the Performance page). */
    async profileScore(_space: SpaceRow): Promise<ProfileScore> {
      throw notImplemented('Profile score');
    },

    /** Upcoming good times to post from the space's dated posts; labelled defaults when too few. */
    async bestTimes(_space: SpaceRow, _options: BestTimesOptions): Promise<BestTimes> {
      throw notImplemented('Best times');
    },

    /** Tick `refresh_performance` (daily, 07:00 UTC): snapshots + recent posts, capped per run. */
    async refreshDue(_now: Date): Promise<PerformanceRefreshResult> {
      return { checked: 0, snapshots: 0, posts: 0, skipped: 'not built yet' };
    },
  };
}

export type PerformanceService = ReturnType<typeof createPerformanceService>;
