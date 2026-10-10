import {
  and,
  asc,
  desc,
  eq,
  exists,
  gte,
  isNotNull,
  isNull,
  lt,
  notExists,
  sql,
} from 'drizzle-orm';
import { type Db, type DbOrTx, qcol } from '../db/client.js';
import { type DigestRow, digests } from '../db/schema/ai.js';
import { communities } from '../db/schema/communities.js';
import { posts } from '../db/schema/posts.js';

export interface DigestWrite {
  spaceId: string;
  /** null = the space briefing. */
  communityId: string | null;
  /** UTC day `YYYY-MM-DD` (lib/dates.ts utcDayString). */
  periodDate: string;
  content: Record<string, unknown>;
  model: string;
}

/** A community whose weekly digest is due. */
export interface DueCommunity {
  spaceId: string;
  communityId: string;
  communityName: string;
}

/** A post that goes into a community's weekly digest. */
export interface WeekPost {
  id: string;
  title: string;
  summary: string | null;
  signals: number;
}

/** Posts a weekly digest counts: in the window, not deleted, hidden or flagged as spam. */
function weekPostWhere(since: Date, until: Date) {
  return and(
    gte(posts.createdAt, since),
    lt(posts.createdAt, until),
    isNull(posts.deletedAt),
    isNull(posts.hiddenAt),
    sql`${posts.aiIsSpam} is not true`,
  );
}

export function createDigestsRepo(db: Db) {
  return {
    /**
     * Non-archived communities (any space) with at least one post in [since, until) and no
     * digest dated `periodDate` yet.
     */
    async dueCommunities(
      periodDate: string,
      since: Date,
      until: Date,
      tx: DbOrTx = db,
    ): Promise<DueCommunity[]> {
      return tx
        .select({
          spaceId: communities.spaceId,
          communityId: communities.id,
          communityName: communities.name,
        })
        .from(communities)
        .where(
          and(
            isNull(communities.archivedAt),
            exists(
              tx
                .select({ one: sql`1` })
                .from(posts)
                .where(and(eq(posts.communityId, communities.id), weekPostWhere(since, until))),
            ),
            notExists(
              tx
                .select({ one: sql`1` })
                .from(digests)
                .where(
                  and(eq(digests.communityId, communities.id), eq(digests.periodDate, periodDate)),
                ),
            ),
          ),
        )
        .orderBy(asc(communities.spaceId), asc(communities.id));
    },

    /** The window's posts in one community, most signals first (capped at `limit`). */
    async weekPosts(
      communityId: string,
      since: Date,
      until: Date,
      limit: number,
      tx: DbOrTx = db,
    ): Promise<WeekPost[]> {
      const signals = sql<number>`${posts.useCount} + ${posts.buildCount}`;
      const rows = await tx
        .select({
          id: posts.id,
          title: posts.title,
          aiSummary: posts.aiSummary,
          analysisStatus: posts.analysisStatus,
          signals,
        })
        .from(posts)
        .where(and(eq(posts.communityId, communityId), weekPostWhere(since, until)))
        .orderBy(desc(signals), desc(posts.createdAt), desc(posts.id))
        .limit(limit);
      return rows.map((row) => ({
        id: row.id,
        title: row.title,
        summary: row.analysisStatus === 'done' ? row.aiSummary : null,
        signals: Number(row.signals),
      }));
    },

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
