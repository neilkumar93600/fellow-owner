import type { ChallengeResponseSummary } from '@fellow-owners/shared';
import { and, asc, desc, eq, gte, isNull, ne, or, sql } from 'drizzle-orm';
import type { Db, DbOrTx } from '../db/client.js';
import { communities, communityMembers } from '../db/schema/communities.js';
import { type AskRow, asks } from '../db/schema/later.js';
import { memberships } from '../db/schema/memberships.js';
import { type PostRow, posts } from '../db/schema/posts.js';

/** An ask (creator challenge) with what its summary card needs. */
export interface AskWithCounts {
  ask: AskRow;
  communityName: string | null;
  /** Visible entries: not deleted, not hidden. */
  entryCount: number;
}

/** ponytail: no pagination; a creator runs a handful of challenges. Add a cursor past ~100. */
const LIST_MAX = 100;

const entryCount = sql<number>`(select count(*)::int from ${posts} where ${posts.askId} = ${asks.id} and ${posts.deletedAt} is null and ${posts.hiddenAt} is null)`;

/** Creator challenges (asks table) and their entries (posts.ask_id). */
export function createAsksRepo(db: Db) {
  function withCounts(tx: DbOrTx) {
    return tx
      .select({ ask: asks, communityName: communities.name, entryCount })
      .from(asks)
      .leftJoin(communities, eq(communities.id, asks.communityId));
  }

  return {
    async insert(values: typeof asks.$inferInsert, tx: DbOrTx = db): Promise<AskRow> {
      const [row] = await tx.insert(asks).values(values).returning();
      if (!row) throw new Error('insert into asks returned no row');
      return row;
    },

    /**
     * Newest first. `openOrDueSince`: open ones plus closed ones due on or after that date (the fan
     * list shows "open + recently closed"). `liveCommunityOnly` drops asks whose community is archived.
     */
    async list(
      spaceId: string,
      {
        openOrDueSince,
        liveCommunityOnly,
      }: { openOrDueSince?: Date; liveCommunityOnly?: boolean } = {},
      tx: DbOrTx = db,
    ): Promise<AskWithCounts[]> {
      return withCounts(tx)
        .where(
          and(
            eq(asks.spaceId, spaceId),
            openOrDueSince
              ? or(eq(asks.status, 'open'), gte(asks.dueAt, openOrDueSince))
              : undefined,
            liveCommunityOnly ? isNull(communities.archivedAt) : undefined,
          ),
        )
        .orderBy(desc(sql`${asks.status} = 'open'`), desc(asks.createdAt), desc(asks.id))
        .limit(LIST_MAX);
    },

    async get(spaceId: string, id: string, tx: DbOrTx = db): Promise<AskWithCounts | null> {
      const [row] = await withCounts(tx)
        .where(and(eq(asks.spaceId, spaceId), eq(asks.id, id)))
        .limit(1);
      return row ?? null;
    },

    /**
     * Locks the ask row for the rest of `tx`: entries take `share` (they only need it to stay
     * open), close takes `update`, so an entry and a close never interleave.
     */
    async lock(
      spaceId: string,
      id: string,
      strength: 'share' | 'update',
      tx: DbOrTx,
    ): Promise<AskRow | null> {
      const [row] = await tx
        .select()
        .from(asks)
        .where(and(eq(asks.spaceId, spaceId), eq(asks.id, id)))
        .limit(1)
        .for(strength);
      return row ?? null;
    },

    /** Entries, oldest first. `visibleOnly` drops hidden ones (deleted ones are always dropped). */
    async entries(
      askId: string,
      { visibleOnly }: { visibleOnly: boolean },
      tx: DbOrTx = db,
    ): Promise<PostRow[]> {
      return tx
        .select()
        .from(posts)
        .where(
          and(
            eq(posts.askId, askId),
            isNull(posts.deletedAt),
            visibleOnly ? isNull(posts.hiddenAt) : undefined,
          ),
        )
        .orderBy(asc(posts.createdAt), asc(posts.id));
    },

    /** Closes an open ask with its summary; null when it was not open (already closed). */
    async close(
      id: string,
      summary: ChallengeResponseSummary,
      tx: DbOrTx = db,
    ): Promise<AskRow | null> {
      const [row] = await tx
        .update(asks)
        .set({ status: 'closed', responseSummary: { ...summary } })
        .where(and(eq(asks.id, id), eq(asks.status, 'open')))
        .returning();
      return row ?? null;
    },

    async setWinner(spaceId: string, id: string, postId: string, tx: DbOrTx = db): Promise<void> {
      await tx
        .update(asks)
        .set({
          responseSummary: sql`jsonb_set(coalesce(${asks.responseSummary}, '{}'::jsonb), '{winnerPostId}', to_jsonb(${postId}::text))`,
        })
        .where(and(eq(asks.spaceId, spaceId), eq(asks.id, id)));
    },

    /**
     * Who hears about a new challenge: active members of `communityId` (any member when null),
     * never `exceptUserId` (the owner).
     */
    async audienceUserIds(
      spaceId: string,
      communityId: string | null,
      exceptUserId: string,
      tx: DbOrTx = db,
    ): Promise<string[]> {
      const active = and(
        eq(memberships.spaceId, spaceId),
        isNull(memberships.removedAt),
        ne(memberships.userId, exceptUserId),
      );
      const rows = communityId
        ? await tx
            .select({ userId: memberships.userId })
            .from(memberships)
            .innerJoin(communityMembers, eq(communityMembers.membershipId, memberships.id))
            .where(and(active, eq(communityMembers.communityId, communityId)))
        : await tx.select({ userId: memberships.userId }).from(memberships).where(active);
      return rows.map((row) => row.userId);
    },
  };
}

export type AsksRepo = ReturnType<typeof createAsksRepo>;
