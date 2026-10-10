import { and, asc, count, eq, inArray, isNull, sql } from 'drizzle-orm';
import { chunk, type Db, type DbOrTx, qcol } from '../db/client.js';
import {
  type CommunityRow,
  communities,
  communityMembers,
  type NewCommunityRow,
} from '../db/schema/communities.js';
import { memberships } from '../db/schema/memberships.js';
import { posts } from '../db/schema/posts.js';

/** Fields the owner can change (PATCH /api/studio/communities/:id). */
export type CommunityUpdate = Partial<
  Pick<
    NewCommunityRow,
    'name' | 'slug' | 'description' | 'tint' | 'icon' | 'sortOrder' | 'archivedAt'
  >
>;

/** A community with the raw numbers behind StudioCommunity. */
export interface CommunityWithStats extends CommunityRow {
  /** Posts not deleted (hidden included). */
  postCount: number;
  /** Posts created since `since`, not deleted. */
  postsSince: number;
  /** community_members rows joined since `since` by active memberships. */
  joinsSince: number;
}

export function createCommunitiesRepo(db: Db) {
  return {
    /** Ordered by sort_order, then creation. Archived ones only with includeArchived. */
    async listBySpace(
      spaceId: string,
      { includeArchived = false }: { includeArchived?: boolean } = {},
      tx: DbOrTx = db,
    ): Promise<CommunityRow[]> {
      return tx
        .select()
        .from(communities)
        .where(
          and(
            eq(communities.spaceId, spaceId),
            includeArchived ? undefined : isNull(communities.archivedAt),
          ),
        )
        .orderBy(asc(communities.sortOrder), asc(communities.createdAt), asc(communities.id));
    },

    async findById(spaceId: string, id: string, tx: DbOrTx = db): Promise<CommunityRow | null> {
      const [row] = await tx
        .select()
        .from(communities)
        .where(and(eq(communities.spaceId, spaceId), eq(communities.id, id)))
        .limit(1);
      return row ?? null;
    },

    async findBySlug(spaceId: string, slug: string, tx: DbOrTx = db): Promise<CommunityRow | null> {
      const [row] = await tx
        .select()
        .from(communities)
        .where(and(eq(communities.spaceId, spaceId), eq(communities.slug, slug)))
        .limit(1);
      return row ?? null;
    },

    /** Only rows of this space; callers compare lengths to detect foreign or unknown ids. */
    async findByIds(spaceId: string, ids: string[], tx: DbOrTx = db): Promise<CommunityRow[]> {
      if (ids.length === 0) return [];
      return tx
        .select()
        .from(communities)
        .where(and(eq(communities.spaceId, spaceId), inArray(communities.id, ids)));
    },

    async listSlugs(spaceId: string, tx: DbOrTx = db): Promise<Set<string>> {
      const rows = await tx
        .select({ slug: communities.slug })
        .from(communities)
        .where(eq(communities.spaceId, spaceId));
      return new Set(rows.map((row) => row.slug));
    },

    /** All communities of the space, archived included (the 20-per-space cap counts these). */
    async countBySpace(spaceId: string, tx: DbOrTx = db): Promise<number> {
      const [row] = await tx
        .select({ n: count() })
        .from(communities)
        .where(eq(communities.spaceId, spaceId));
      return row?.n ?? 0;
    },

    async nextSortOrder(spaceId: string, tx: DbOrTx = db): Promise<number> {
      const [row] = await tx
        .select({ max: sql<number | null>`max(${communities.sortOrder})` })
        .from(communities)
        .where(eq(communities.spaceId, spaceId));
      return row?.max === null || row?.max === undefined ? 0 : Number(row.max) + 1;
    },

    async insert(values: NewCommunityRow, tx: DbOrTx = db): Promise<CommunityRow> {
      const [row] = await tx.insert(communities).values(values).returning();
      if (!row) throw new Error('insert into communities returned no row');
      return row;
    },

    async insertMany(values: NewCommunityRow[], tx: DbOrTx = db): Promise<CommunityRow[]> {
      const out: CommunityRow[] = [];
      for (const part of chunk(values)) {
        out.push(...(await tx.insert(communities).values(part).returning()));
      }
      return out;
    },

    async update(
      spaceId: string,
      id: string,
      patch: CommunityUpdate,
      tx: DbOrTx = db,
    ): Promise<CommunityRow | null> {
      if (Object.keys(patch).length === 0) {
        const [row] = await tx
          .select()
          .from(communities)
          .where(and(eq(communities.spaceId, spaceId), eq(communities.id, id)))
          .limit(1);
        return row ?? null;
      }
      const [row] = await tx
        .update(communities)
        .set(patch)
        .where(and(eq(communities.spaceId, spaceId), eq(communities.id, id)))
        .returning();
      return row ?? null;
    },

    /** member_count += delta (never below 0). Call inside the join/leave transaction. */
    async adjustMemberCounts(
      spaceId: string,
      communityIds: string[],
      delta: number,
      tx: DbOrTx = db,
    ): Promise<void> {
      if (communityIds.length === 0 || delta === 0) return;
      await tx
        .update(communities)
        .set({ memberCount: sql`greatest(0, ${communities.memberCount} + ${delta})` })
        .where(and(eq(communities.spaceId, spaceId), inArray(communities.id, communityIds)));
    },

    /** Recomputes member_count from community_members of active memberships (seed, repair). */
    async recountMembers(spaceId: string, tx: DbOrTx = db): Promise<void> {
      await tx
        .update(communities)
        .set({
          memberCount: sql`(
            select count(*)::int from ${communityMembers}
            inner join ${memberships} on ${qcol(memberships.id)} = ${qcol(communityMembers.membershipId)}
            where ${qcol(communityMembers.communityId)} = ${qcol(communities.id)}
              and ${qcol(memberships.removedAt)} is null
          )`,
        })
        .where(eq(communities.spaceId, spaceId));
    },

    /** Every community (archived included) with post and join counts for the studio. */
    async listWithStats(
      spaceId: string,
      since: Date,
      tx: DbOrTx = db,
    ): Promise<CommunityWithStats[]> {
      const sinceIso = since.toISOString();
      return tx
        .select({
          id: communities.id,
          spaceId: communities.spaceId,
          slug: communities.slug,
          name: communities.name,
          description: communities.description,
          tint: communities.tint,
          icon: communities.icon,
          sortOrder: communities.sortOrder,
          memberCount: communities.memberCount,
          archivedAt: communities.archivedAt,
          createdAt: communities.createdAt,
          postCount: sql<number>`(
            select count(*)::int from ${posts}
            where ${qcol(posts.communityId)} = ${qcol(communities.id)}
              and ${qcol(posts.deletedAt)} is null
          )`,
          postsSince: sql<number>`(
            select count(*)::int from ${posts}
            where ${qcol(posts.communityId)} = ${qcol(communities.id)}
              and ${qcol(posts.deletedAt)} is null
              and ${qcol(posts.createdAt)} >= ${sinceIso}::timestamptz
          )`,
          joinsSince: sql<number>`(
            select count(*)::int from ${communityMembers}
            inner join ${memberships} on ${qcol(memberships.id)} = ${qcol(communityMembers.membershipId)}
            where ${qcol(communityMembers.communityId)} = ${qcol(communities.id)}
              and ${qcol(memberships.removedAt)} is null
              and ${qcol(communityMembers.joinedAt)} >= ${sinceIso}::timestamptz
          )`,
        })
        .from(communities)
        .where(eq(communities.spaceId, spaceId))
        .orderBy(asc(communities.sortOrder), asc(communities.createdAt), asc(communities.id));
    },
  };
}

export type CommunitiesRepo = ReturnType<typeof createCommunitiesRepo>;
