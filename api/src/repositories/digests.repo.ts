import { and, desc, eq, isNotNull, isNull, lt, sql } from 'drizzle-orm';
import { type Db, type DbOrTx, qcol } from '../db/client.js';
import { type DigestRow, digests } from '../db/schema/ai.js';

export interface DigestWrite {
  spaceId: string;
  /** null = the space briefing. */
  communityId: string | null;
  /** UTC day `YYYY-MM-DD` (lib/dates.ts utcDayString). */
  periodDate: string;
  content: Record<string, unknown>;
  model: string;
}

export function createDigestsRepo(db: Db) {
  return {
    /** Today's (or any day's) space briefing. */
    async findBriefing(
      spaceId: string,
      periodDate: string,
      tx: DbOrTx = db,
    ): Promise<DigestRow | null> {
      const [row] = await tx
        .select()
        .from(digests)
        .where(
          and(
            eq(digests.spaceId, spaceId),
            isNull(digests.communityId),
            eq(digests.periodDate, periodDate),
          ),
        )
        .limit(1);
      return row ?? null;
    },

    async findById(spaceId: string, id: string, tx: DbOrTx = db): Promise<DigestRow | null> {
      const [row] = await tx
        .select()
        .from(digests)
        .where(and(eq(digests.spaceId, spaceId), eq(digests.id, id)))
        .limit(1);
      return row ?? null;
    },

    async findForCommunity(
      spaceId: string,
      communityId: string,
      periodDate: string,
      tx: DbOrTx = db,
    ): Promise<DigestRow | null> {
      const [row] = await tx
        .select()
        .from(digests)
        .where(
          and(
            eq(digests.spaceId, spaceId),
            eq(digests.communityId, communityId),
            eq(digests.periodDate, periodDate),
          ),
        )
        .limit(1);
      return row ?? null;
    },

    /** Latest digest per community (StudioCommunity.digest, P1). */
    async latestForCommunities(spaceId: string, tx: DbOrTx = db): Promise<Map<string, DigestRow>> {
      const rows = await tx
        .selectDistinctOn([digests.communityId])
        .from(digests)
        .where(and(eq(digests.spaceId, spaceId), isNotNull(digests.communityId)))
        .orderBy(digests.communityId, desc(digests.periodDate));
      const out = new Map<string, DigestRow>();
      for (const row of rows) if (row.communityId) out.set(row.communityId, row);
      return out;
    },

    /**
     * Stores the day's digest: insert, or replace content/model on the same (space, community,
     * day). `countRegeneration` adds one to `regenerations` when replacing (POST regenerate).
     */
    async upsert(
      values: DigestWrite,
      { countRegeneration = false }: { countRegeneration?: boolean } = {},
      tx: DbOrTx = db,
    ): Promise<DigestRow> {
      const [row] = await tx
        .insert(digests)
        .values(values)
        .onConflictDoUpdate({
          target: [digests.spaceId, digests.communityId, digests.periodDate],
          set: {
            content: values.content,
            model: values.model,
            updatedAt: new Date(),
            regenerations: countRegeneration
              ? sql`${digests.regenerations} + 1`
              : sql`${digests.regenerations}`,
          },
        })
        .returning();
      if (!row) throw new Error('digest upsert returned no row');
      return row;
    },

    /**
     * POST regenerate: replaces the day's digest and adds one to `regenerations`, but only while
     * regenerations < maxRegenerations (checked atomically in the upsert). Inserts when the day
     * has no digest yet (not counted). Returns null when the cap was already reached.
     */
    async replaceCapped(
      values: DigestWrite,
      maxRegenerations: number,
      tx: DbOrTx = db,
    ): Promise<DigestRow | null> {
      const [row] = await tx
        .insert(digests)
        .values(values)
        .onConflictDoUpdate({
          target: [digests.spaceId, digests.communityId, digests.periodDate],
          set: {
            content: values.content,
            model: values.model,
            updatedAt: new Date(),
            regenerations: sql`${qcol(digests.regenerations)} + 1`,
          },
          setWhere: sql`${qcol(digests.regenerations)} < ${maxRegenerations}`,
        })
        .returning();
      return row ?? null;
    },

    /** Retention (05 §8: 30 days): deletes digests with period_date before `beforeDate`. */
    async purgeOlderThan(beforeDate: string, tx: DbOrTx = db): Promise<number> {
      const rows = await tx
        .delete(digests)
        .where(lt(digests.periodDate, beforeDate))
        .returning({ id: digests.id });
      return rows.length;
    },
  };
}

export type DigestsRepo = ReturnType<typeof createDigestsRepo>;
