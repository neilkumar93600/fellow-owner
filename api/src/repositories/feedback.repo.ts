import type { FeedbackRefType, FeedbackVerdict } from '@fellow-owners/shared';
import { and, eq, inArray } from 'drizzle-orm';
import type { Db, DbOrTx } from '../db/client.js';
import { type AiFeedbackRow, aiFeedback } from '../db/schema/ai.js';

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
  };
}

export type FeedbackRepo = ReturnType<typeof createFeedbackRepo>;
