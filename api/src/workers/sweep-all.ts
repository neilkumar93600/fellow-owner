import { and, eq, isNull, sql } from 'drizzle-orm';
import type { CoreDeps } from '../container.js';
import { inbound, posts } from '../db/schema/index.js';
import { ANALYSIS_LEASE_SECONDS } from '../repositories/posts.repo.js';

export type SweepAllDeps = Pick<CoreDeps, 'db' | 'analyzer' | 'logger'>;

/** Spaces swept at once. */
const BATCH = 5;

const leaseExpired = (
  claimedAt: typeof posts.analysisClaimedAt | typeof inbound.analysisClaimedAt,
) =>
  sql`(${claimedAt} is null or ${claimedAt} < now() - make_interval(secs => ${ANALYSIS_LEASE_SECONDS}))`;

/**
 * Sweeps every space with pending, postponed or expired-lease items, 5 spaces at a time, so
 * analyses finish even when the owner never opens the studio. Resolves with the spaces swept.
 * ponytail: one analyzer.sweep per space per tick (25 items/hour/space); loop on `remaining` if
 * a space ever piles up more than that between dashboard visits.
 */
export async function sweepAll(deps: SweepAllDeps): Promise<number> {
  const { db, analyzer, logger } = deps;
  const rows = await db
    .select({ spaceId: posts.spaceId })
    .from(posts)
    .where(
      and(
        eq(posts.analysisStatus, 'pending'),
        isNull(posts.deletedAt),
        leaseExpired(posts.analysisClaimedAt),
      ),
    )
    .union(
      db
        .select({ spaceId: inbound.spaceId })
        .from(inbound)
        .where(and(eq(inbound.analysisStatus, 'pending'), leaseExpired(inbound.analysisClaimedAt))),
    );

  const spaceIds = rows.map((row) => row.spaceId);
  for (let i = 0; i < spaceIds.length; i += BATCH) {
    const batch = spaceIds.slice(i, i + BATCH);
    const results = await Promise.allSettled(batch.map((spaceId) => analyzer.sweep(spaceId)));
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        logger.error({ err: result.reason, spaceId: batch[index] }, 'sweep-all: space failed');
      }
    });
  }
  return spaceIds.length;
}
