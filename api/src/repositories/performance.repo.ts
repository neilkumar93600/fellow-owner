import type { Db } from '../db/client.js';

/**
 * F1 Post performance: platform_snapshots and platform_posts (db/schema/performance.ts).
 * Wave A skeleton (registered as repos.performance); B1 adds the queries: one snapshot per profile
 * per UTC day, posts upserted on (space_id, platform, external_id), series and top posts by window.
 */
export function createPerformanceRepo(_db: Db) {
  return {};
}

export type PerformanceRepo = ReturnType<typeof createPerformanceRepo>;
