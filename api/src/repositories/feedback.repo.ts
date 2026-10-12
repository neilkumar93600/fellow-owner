import type { FeedbackRefType, FeedbackVerdict } from '@fellow-owners/shared';
import { and, desc, eq, inArray, isNotNull, isNull, ne, or, sql } from 'drizzle-orm';
import type { TriageFeedbackExample } from '../ai/tasks/triage-item.js';
import type { Db, DbOrTx } from '../db/client.js';
import { type AiFeedbackRow, aiFeedback } from '../db/schema/ai.js';
import { inbound } from '../db/schema/inbound.js';
import { posts } from '../db/schema/posts.js';
import { spaces } from '../db/schema/spaces.js';

export interface FeedbackKey {
  spaceId: string;
  refType: FeedbackRefType;
  /** Item id, or `{digestId}:{index}` for a briefing highlight. */
  refId: string;
  userId: string;
}

/** `{digestId}:{index}`: the ref id of a briefing highlight. */
export function briefingHighlightRef(digestId: string, index: number): string {
  return `${digestId}:${index}`;
}

/** ref_id as a uuid when it is a post or pitch id, else null (never a cast error). */
const refUuid = sql`case when ${aiFeedback.refType} in ('post', 'inbound')
  and ${aiFeedback.refId} ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  then ${aiFeedback.refId}::uuid end`;

/**
 * The recentExamples query. The joins compare the uuid primary keys (not `id::text = ref_id`),
 * so each vote is one index lookup instead of a scan of the space's posts and pitches.
 * Exported for the plan test.
 */
export function recentExamplesQuery(
  spaceId: string,
  { excludeRefId, limit }: { excludeRefId?: string; limit: number },
  tx: DbOrTx,
) {
  return tx
    .select({
      verdict: aiFeedback.verdict,
      refType: aiFeedback.refType,
      postTitle: posts.title,
      postSummary: posts.aiSummary,
      pitchTitle: inbound.subject,
      pitchSummary: inbound.aiSummary,
    })
    .from(aiFeedback)
    .innerJoin(
      spaces,
      and(eq(spaces.id, aiFeedback.spaceId), eq(spaces.ownerUserId, aiFeedback.createdByUserId)),
    )
    .leftJoin(
      posts,
      and(
        eq(aiFeedback.refType, 'post'),
        eq(posts.id, refUuid),
        eq(posts.spaceId, aiFeedback.spaceId),
        isNull(posts.deletedAt),
      ),
    )
    .leftJoin(
      inbound,
      and(
        eq(aiFeedback.refType, 'inbound'),
        eq(inbound.id, refUuid),
        eq(inbound.spaceId, aiFeedback.spaceId),
      ),
    )
    .where(
      and(
        eq(aiFeedback.spaceId, spaceId),
        inArray(aiFeedback.refType, ['post', 'inbound']),
        or(isNotNull(posts.id), isNotNull(inbound.id)),
        excludeRefId ? ne(aiFeedback.refId, excludeRefId) : undefined,
      ),
    )
    .orderBy(desc(aiFeedback.createdAt), desc(aiFeedback.id))
    .limit(limit);
}

export function createFeedbackRepo(db: Db) {
  return {
    /** Insert or change the vote (unique per ref_type, ref_id, user). */
    async upsert(
      key: FeedbackKey,
      verdict: FeedbackVerdict,
      tx: DbOrTx = db,
    ): Promise<AiFeedbackRow> {
      const [row] = await tx
        .insert(aiFeedback)
        .values({
          spaceId: key.spaceId,
          refType: key.refType,
          refId: key.refId,
          verdict,
          createdByUserId: key.userId,
        })
        .onConflictDoUpdate({
          target: [aiFeedback.refType, aiFeedback.refId, aiFeedback.createdByUserId],
          set: { verdict, spaceId: key.spaceId, createdAt: new Date() },
        })
        .returning();
      if (!row) throw new Error('feedback upsert returned no row');
      return row;
    },

    /** verdict null clears the vote. */
    async remove(key: FeedbackKey, tx: DbOrTx = db): Promise<boolean> {
      const rows = await tx
        .delete(aiFeedback)
        .where(
          and(
            eq(aiFeedback.spaceId, key.spaceId),
            eq(aiFeedback.refType, key.refType),
            eq(aiFeedback.refId, key.refId),
            eq(aiFeedback.createdByUserId, key.userId),
          ),
        )
        .returning({ id: aiFeedback.id });
      return rows.length > 0;
    },

    async find(key: FeedbackKey, tx: DbOrTx = db): Promise<FeedbackVerdict | null> {
      const [row] = await tx
        .select({ verdict: aiFeedback.verdict })
        .from(aiFeedback)
        .where(
          and(
            eq(aiFeedback.spaceId, key.spaceId),
            eq(aiFeedback.refType, key.refType),
            eq(aiFeedback.refId, key.refId),
            eq(aiFeedback.createdByUserId, key.userId),
          ),
        )
        .limit(1);
      return row?.verdict ?? null;
    },

    /** The user's votes on many refs of one type. */
    async findMany(
      spaceId: string,
      refType: FeedbackRefType,
      refIds: string[],
      userId: string,
      tx: DbOrTx = db,
    ): Promise<Map<string, FeedbackVerdict>> {
      const out = new Map<string, FeedbackVerdict>();
      if (refIds.length === 0) return out;
      const rows = await tx
        .select({ refId: aiFeedback.refId, verdict: aiFeedback.verdict })
        .from(aiFeedback)
        .where(
          and(
            eq(aiFeedback.spaceId, spaceId),
            eq(aiFeedback.refType, refType),
            inArray(aiFeedback.refId, refIds),
            eq(aiFeedback.createdByUserId, userId),
          ),
        );
      for (const row of rows) out.set(row.refId, row.verdict);
      return out;
    },

    /**
     * The creator's latest thumbs on posts and pitches that still exist, newest first, with the
     * item's title and AI summary (triage examples). Votes by anyone but the space owner and
     * briefing highlights are left out; `excludeRefId` drops the item being triaged.
     */
    async recentExamples(
      spaceId: string,
      options: { excludeRefId?: string; limit: number },
      tx: DbOrTx = db,
    ): Promise<TriageFeedbackExample[]> {
      const rows = await recentExamplesQuery(spaceId, options, tx);
      return rows.map((row) =>
        row.refType === 'post'
          ? {
              verdict: row.verdict,
              kind: 'post',
              title: row.postTitle ?? '',
              summary: row.postSummary,
            }
          : {
              verdict: row.verdict,
              kind: 'inbound',
              title: row.pitchTitle ?? '',
              summary: row.pitchSummary,
            },
      );
    },
  };
}

export type FeedbackRepo = ReturnType<typeof createFeedbackRepo>;
