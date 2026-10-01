import { DAILY_CAPS, HOURLY_CAPS, LIMITS } from '@fellow-owners/shared';
import type { DbOrTx } from '../db/client.js';
import { addDays, HOUR_MS, hoursAgo, startOfUtcDay } from '../lib/dates.js';
import { type AppError, dailyCapReached, rateLimited } from '../lib/errors.js';
import type { Repos } from '../repositories/index.js';

/**
 * Write caps (05 §7, shared DAILY_CAPS / HOURLY_CAPS):
 * - per user per space per UTC day, counted from created_at: pitches 5, posts 20, comments 100
 *   (deleted items still count, so delete + repost cannot get around the cap)
 * - community suggestions: 10 per user per rolling hour, counted in ai_runs
 * - promote drafts: 10 per space per UTC day, counted in ai_runs
 * - briefing regenerations: 5 per space per UTC day (digests.regenerations)
 *
 * Exactness under concurrency: callers check a daily cap inside the same transaction as the
 * insert, after `lockWrites` (an advisory lock on space + user), so two parallel requests cannot
 * both take the last slot.
 */

export type DailyCapKind = 'posts' | 'pitches' | 'comments';

export interface CapDetails {
  limit: number;
  used: number;
  /** When the cap frees up again (next 00:00 UTC, or the end of the rolling hour). */
  resetsAt: string;
}

/** Slots left today, never negative. */
export function remaining(limit: number, used: number): number {
  return Math.max(0, limit - used);
}

export function nextUtcMidnight(now: Date = new Date()): Date {
  return addDays(startOfUtcDay(now), 1);
}

/** The message shown under the post/pitch form (03 §7 "Daily cap reached"). */
export function dailyCapMessage(kind: DailyCapKind, spaceName: string): string {
  const limit = DAILY_CAPS[kind];
  switch (kind) {
    case 'pitches':
      return `You've reached today's limit of ${limit} pitches to ${spaceName}. Try again tomorrow.`;
    case 'posts':
      return `You've reached today's limit of ${limit} posts in ${spaceName}'s space. Try again tomorrow.`;
    case 'comments':
      return `You've reached today's limit of ${limit} comments in ${spaceName}'s space. Try again tomorrow.`;
  }
}

export function createLimitsService(deps: { repos: Repos }) {
  const { repos } = deps;

  async function usedToday(
    kind: DailyCapKind,
    spaceId: string,
    membershipId: string,
    tx?: DbOrTx,
    now: Date = new Date(),
  ): Promise<number> {
    const since = startOfUtcDay(now);
    switch (kind) {
      case 'posts':
        return repos.posts.countByAuthorSince(spaceId, membershipId, since, tx);
      case 'pitches':
        return repos.pitches.countBySenderSince(spaceId, membershipId, since, tx);
      case 'comments':
        return repos.comments.countByAuthorSince(spaceId, membershipId, since, tx);
    }
  }

  /** The 429 daily_cap_reached error for briefing regenerations. */
  function regenerationCapError(used: number = LIMITS.briefing.regenerationsPerDay): AppError {
    const limit = LIMITS.briefing.regenerationsPerDay;
    const details: CapDetails = { limit, used, resetsAt: nextUtcMidnight().toISOString() };
    return dailyCapReached(
      `You've regenerated today's briefing ${limit} times. Try again tomorrow.`,
      details,
    );
  }

  return {
    usedToday,

    /** Slots left today for one kind (MySpace.caps). A missing membership has used none. */
    async leftToday(
      kind: DailyCapKind,
      spaceId: string,
      membershipId: string | null,
      tx?: DbOrTx,
    ): Promise<number> {
      if (!membershipId) return DAILY_CAPS[kind];
      return remaining(DAILY_CAPS[kind], await usedToday(kind, spaceId, membershipId, tx));
    },

    /** Serializes one user's capped writes in a space for the rest of transaction `tx`. */
    async lockWrites(spaceId: string, userId: string, tx: DbOrTx): Promise<void> {
      await repos.memberships.lockUserInSpace(spaceId, userId, tx);
    },

    /**
     * 429 daily_cap_reached when the member has used today's slots for `kind`.
     * Call inside the insert's transaction, after lockWrites.
     */
    async assertDailyCap(
      kind: DailyCapKind,
      space: { id: string; displayName: string },
      membershipId: string,
      tx?: DbOrTx,
    ): Promise<void> {
      const now = new Date();
      const used = await usedToday(kind, space.id, membershipId, tx, now);
      const limit = DAILY_CAPS[kind];
      if (used >= limit) {
        const details: CapDetails = {
          limit,
          used,
          resetsAt: nextUtcMidnight(now).toISOString(),
        };
        throw dailyCapReached(dailyCapMessage(kind, space.displayName), details);
      }
    },

    /** 429 rate_limited after 10 community suggestions in the last hour (any space). */
    async assertSuggestionsAllowed(userId: string): Promise<void> {
      const now = new Date();
      const limit = HOURLY_CAPS.suggestCommunities;
      const used = await repos.aiRuns.countByUserTaskSince(
        userId,
        'suggestCommunities',
        hoursAgo(1, now),
      );
      if (used >= limit) {
        const details: CapDetails = {
          limit,
          used,
          resetsAt: new Date(now.getTime() + HOUR_MS).toISOString(),
        };
        throw rateLimited('Too many suggestion requests. Try again in a little while.', details);
      }
    },

    /** 429 daily_cap_reached after 10 promote-draft generations today in the space. */
    async assertPromoteDraftsAllowed(spaceId: string): Promise<void> {
      const now = new Date();
      const limit = DAILY_CAPS.promoteDrafts;
      const used = await repos.aiRuns.countBySpaceTaskSince(
        spaceId,
        'promoteDrafts',
        startOfUtcDay(now),
      );
      if (used >= limit) {
        const details: CapDetails = {
          limit,
          used,
          resetsAt: nextUtcMidnight(now).toISOString(),
        };
        throw dailyCapReached(
          `You've generated promotion drafts ${limit} times today. Try again tomorrow.`,
          details,
        );
      }
    },

    /** Briefing regenerations left today (digests.regenerations, max 5). */
    regenerationsLeft(regenerations: number | null | undefined): number {
      return remaining(LIMITS.briefing.regenerationsPerDay, regenerations ?? 0);
    },

    regenerationCapError,

    /** 429 daily_cap_reached when today's briefing was already regenerated 5 times. */
    assertRegenerationAllowed(regenerations: number | null | undefined): void {
      const used = regenerations ?? 0;
      if (used >= LIMITS.briefing.regenerationsPerDay) throw regenerationCapError(used);
    },
  };
}

export type LimitsService = ReturnType<typeof createLimitsService>;
