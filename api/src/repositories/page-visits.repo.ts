import type { FeedbackVerdict } from '@fellow-owners/shared';
import { and, count, eq, gte, isNull, lt, sql } from 'drizzle-orm';
import type { Db, DbOrTx } from '../db/client.js';
import { aiFeedback } from '../db/schema/ai.js';
import { memberships } from '../db/schema/memberships.js';
import { pageVisits } from '../db/schema/page-visits.js';
import { posts } from '../db/schema/posts.js';
import { promotions } from '../db/schema/promotions.js';
import { teamMembers } from '../db/schema/social.js';

/**
 * page_visits (hashed bio-page visitors per day) plus the small counts behind the studio metrics
 * card. Ranges are [from, to): days as `YYYY-MM-DD`, instants as Dates.
 */
export function createPageVisitsRepo(db: Db) {
  return {
    /** One row per visitor per day; a repeat visit increments `visits`. */
    async record(
      spaceId: string,
      visitorHash: string,
      day: string,
      tx: DbOrTx = db,
    ): Promise<void> {
      await tx
        .insert(pageVisits)
        .values({ spaceId, visitorHash, day })
        .onConflictDoUpdate({
          target: [pageVisits.spaceId, pageVisits.visitorHash, pageVisits.day],
          set: { visits: sql`${pageVisits.visits} + 1` },
        });
    },

    /** Unique visitors per day, summed over the range. */
    async visitorsBetween(spaceId: string, fromDay: string, toDay: string, tx: DbOrTx = db) {
      const [row] = await tx
        .select({ n: count() })
        .from(pageVisits)
        .where(
          and(
            eq(pageVisits.spaceId, spaceId),
            gte(pageVisits.day, fromDay),
            lt(pageVisits.day, toDay),
          ),
        );
      return row?.n ?? 0;
    },

    /** Members who joined in the range (the owner's own membership never counts). */
    async joinsBetween(spaceId: string, from: Date, to: Date, tx: DbOrTx = db) {
      const [row] = await tx
        .select({ n: count() })
        .from(memberships)
        .where(
          and(
            eq(memberships.spaceId, spaceId),
            eq(memberships.role, 'member'),
            gte(memberships.joinedAt, from),
            lt(memberships.joinedAt, to),
          ),
        );
      return row?.n ?? 0;
    },

    /** Creator thumbs on AI picks in the range. */
    async verdictsBetween(spaceId: string, from: Date, to: Date, tx: DbOrTx = db) {
      const rows = await tx
        .select({ verdict: aiFeedback.verdict, n: count() })
        .from(aiFeedback)
        .where(
          and(
            eq(aiFeedback.spaceId, spaceId),
            gte(aiFeedback.createdAt, from),
            lt(aiFeedback.createdAt, to),
          ),
        )
        .groupBy(aiFeedback.verdict);
      const out: Record<FeedbackVerdict, number> = { up: 0, down: 0 };
      for (const row of rows) out[row.verdict] = row.n;
      return out;
    },

    /** Live projects with at least 2 accepted team members. */
    async collabCount(spaceId: string, tx: DbOrTx = db) {
      const rows = await tx
        .select({ postId: teamMembers.postId })
        .from(teamMembers)
        .innerJoin(posts, eq(posts.id, teamMembers.postId))
        .where(
          and(
            eq(posts.spaceId, spaceId),
            isNull(posts.deletedAt),
            eq(teamMembers.status, 'accepted'),
          ),
        )
        .groupBy(teamMembers.postId)
        .having(sql`count(*) >= 2`);
      return rows.length;
    },

    /** Promotions published in the range. */
    async publishedBetween(spaceId: string, from: Date, to: Date, tx: DbOrTx = db) {
      const [row] = await tx
        .select({ n: count() })
        .from(promotions)
        .where(
          and(
            eq(promotions.spaceId, spaceId),
            gte(promotions.publishedAt, from),
            lt(promotions.publishedAt, to),
          ),
        );
      return row?.n ?? 0;
    },
  };
}

export type PageVisitsRepo = ReturnType<typeof createPageVisitsRepo>;
