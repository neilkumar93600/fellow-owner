import type { PlatformEntry } from '@fellow-owners/shared';
import { eq } from 'drizzle-orm';
import type { CoreDeps } from '../container.js';
import { spaces } from '../db/schema/spaces.js';
import type { Logger } from '../lib/logger.js';
import {
  createPlatformLookup,
  type PlatformLookup,
  parseProfileUrl,
} from '../lib/platform-lookup.js';

/** Profiles refreshed per run: bounds Apify spend and the cron's wall time. */
export const REFRESH_MAX_PER_RUN = 50;
const CONCURRENCY = 5;

export interface RefreshResult {
  /** Profiles looked up this run. */
  checked: number;
  /** Follower counts that were replaced with a fresh live value. */
  updated: number;
  /** Lookups that failed or answered a sample: the old value was kept. */
  kept: number;
}

export interface RefreshDeps extends Pick<CoreDeps, 'db' | 'env'> {
  logger: Logger;
  /** Tests inject a fake resolver; production builds one from APIFY_TOKEN. */
  lookup?: PlatformLookup;
}

/**
 * Daily follower refresh (Round 4 spec section 6), run by GET/POST /api/cron/refresh-followers:
 * every linked profile of the non-demo spaces, oldest `fetchedAt` first (never fetched = oldest),
 * at most REFRESH_MAX_PER_RUN per run, resolved with recent posts off.
 *
 * A failed or simulated answer keeps the old follower count. It still stamps `fetchedAt`, so one
 * private or removed account moves to the back of the queue instead of being retried first every day.
 *
 * ponytail: reads every non-demo space's platforms to pick the oldest 50; add an indexed
 * "next refresh" column if the spaces table ever outgrows that scan.
 */
export async function refreshFollowers(deps: RefreshDeps): Promise<RefreshResult> {
  const { db, logger } = deps;
  const lookup =
    deps.lookup ??
    createPlatformLookup({ token: deps.env.APIFY_TOKEN, enabled: deps.env.APIFY_ENABLED, logger });

  const rows = await db
    .select({ id: spaces.id, platforms: spaces.platforms })
    .from(spaces)
    .where(eq(spaces.isDemo, false));

  const queue = rows
    .flatMap((row) =>
      (row.platforms ?? []).flatMap((entry) => {
        const target = parseProfileUrl(entry.url);
        return target
          ? [{ spaceId: row.id, url: entry.url, target, at: entry.fetchedAt ?? '' }]
          : [];
      }),
    )
    .sort((a, b) => a.at.localeCompare(b.at))
    .slice(0, REFRESH_MAX_PER_RUN);

  // spaceId -> url -> fresh followers (null = keep the old one)
  const results = new Map<string, Map<string, number | null>>();
  for (let i = 0; i < queue.length; i += CONCURRENCY) {
    await Promise.all(
      queue.slice(i, i + CONCURRENCY).map(async (item) => {
        let followers: number | null = null;
        try {
          const res = await lookup.lookup(item.target, { recent: false });
          if (res.status === 'ready' && res.profile.source !== 'simulated') {
            followers = res.profile.followers;
          }
        } catch (error) {
          logger.warn({ spaceId: item.spaceId, error }, 'follower refresh: lookup threw');
        }
        const bySpace = results.get(item.spaceId) ?? new Map<string, number | null>();
        bySpace.set(item.url, followers);
        results.set(item.spaceId, bySpace);
      }),
    );
  }

  const stamp = new Date().toISOString();
  let updated = 0;
  for (const [spaceId, byUrl] of results) {
    // Re-read inside the transaction: the owner may have edited the platforms during the lookups.
    await db.transaction(async (tx) => {
      const [row] = await tx
        .select({ platforms: spaces.platforms })
        .from(spaces)
        .where(eq(spaces.id, spaceId))
        .for('update');
      if (!row) return;
      const next: PlatformEntry[] = (row.platforms ?? []).map((entry) => {
        if (!byUrl.has(entry.url)) return entry;
        const followers = byUrl.get(entry.url);
        if (followers === null || followers === undefined) return { ...entry, fetchedAt: stamp };
        updated += 1;
        return { ...entry, followers, fetchedAt: stamp };
      });
      await tx.update(spaces).set({ platforms: next }).where(eq(spaces.id, spaceId));
    });
  }

  const result = { checked: queue.length, updated, kept: queue.length - updated };
  logger.info(result, 'follower refresh done');
  return result;
}
