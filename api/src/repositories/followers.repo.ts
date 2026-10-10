import { type FollowerTagger, LIMITS } from '@fellow-owners/shared';
import { and, asc, count, desc, eq, inArray, isNotNull, isNull, type SQL, sql } from 'drizzle-orm';
import { chunk, type Db, type DbOrTx, likePattern, qcol } from '../db/client.js';
import { user } from '../db/schema/auth.js';
import { communities, communityMembers } from '../db/schema/communities.js';
import {
  type FollowerRow,
  followerCommunities,
  followers,
  type NewFollowerRow,
} from '../db/schema/followers.js';
import { type ImportRow, imports, type NewImportRow } from '../db/schema/later.js';
import { memberships } from '../db/schema/memberships.js';
import type { TimeCursor } from '../lib/pagination.js';

/** Fields the owner can change (PATCH /api/studio/followers/:id). */
export type FollowerUpdate = Partial<
  Pick<NewFollowerRow, 'name' | 'handle' | 'platform' | 'email' | 'note'>
>;

/** GET /api/studio/followers filters (`community` resolved to an id by the service). */
export interface FollowerFilter {
  q?: string;
  communityId?: string;
  /** Followers with no tag in an active community. */
  untagged?: boolean;
  joined?: boolean;
}

/** A follower with the linked membership's joined_at (Follower.joinedAt). */
export interface FollowerWithJoin extends FollowerRow {
  joinedAt: Date | null;
}

/** A follower's community tag with the community fields Follower.communities needs. */
export interface FollowerTagRow {
  followerId: string;
  communityId: string;
  slug: string;
  name: string;
  tint: string;
  icon: string;
  taggedBy: FollowerTagger;
}

/** A tag in a non-archived community of the follower's space. */
const activeTagExists = sql`exists (
  select 1 from ${followerCommunities}
  join ${communities} on ${qcol(communities.id)} = ${qcol(followerCommunities.communityId)}
  where ${qcol(followerCommunities.followerId)} = ${qcol(followers.id)}
    and ${qcol(communities.archivedAt)} is null
)`;

function filterConditions(spaceId: string, filter: FollowerFilter): Array<SQL | undefined> {
  const term = filter.q?.trim();
  const pattern = term ? likePattern(term) : null;
  return [
    eq(followers.spaceId, spaceId),
    pattern
      ? sql`(${followers.name} ilike ${pattern} or ${followers.handle} ilike ${pattern} or ${followers.email} ilike ${pattern} or ${followers.note} ilike ${pattern})`
      : undefined,
    filter.communityId
      ? sql`exists (select 1 from ${followerCommunities} where ${qcol(followerCommunities.followerId)} = ${qcol(followers.id)} and ${qcol(followerCommunities.communityId)} = ${filter.communityId})`
      : undefined,
    filter.untagged ? sql`not ${activeTagExists}` : undefined,
    filter.joined === true ? isNotNull(followers.membershipId) : undefined,
    filter.joined === false ? isNull(followers.membershipId) : undefined,
  ];
}

/**
 * The follower roster (followers, follower_communities) and the imports that fill it.
 * Owner-only data: every query is scoped to the space.
 */
export function createFollowersRepo(db: Db) {
  const withJoin = (tx: DbOrTx) =>
    tx
      .select({ follower: followers, joinedAt: memberships.joinedAt })
      .from(followers)
      .leftJoin(memberships, eq(memberships.id, followers.membershipId));
  const flatten = (rows: Array<{ follower: FollowerRow; joinedAt: Date | null }>) =>
    rows.map((row) => ({ ...row.follower, joinedAt: row.joinedAt }));

  return {
    /** Newest first, keyset on (created_at, id). Fetch `limit + 1` to detect more. */
    async list(
      spaceId: string,
      filter: FollowerFilter,
      page: { cursor: TimeCursor | null; limit: number },
      tx: DbOrTx = db,
    ): Promise<FollowerWithJoin[]> {
      const conditions = filterConditions(spaceId, filter);
      if (page.cursor) {
        conditions.push(
          sql`(${followers.createdAt}, ${followers.id}) < (${page.cursor.createdAt.toISOString()}::timestamptz, ${page.cursor.id}::uuid)`,
        );
      }
      const rows = await withJoin(tx)
        .where(and(...conditions))
        .orderBy(desc(followers.createdAt), desc(followers.id))
        .limit(page.limit);
      return flatten(rows);
    },

    async count(spaceId: string, filter: FollowerFilter, tx: DbOrTx = db): Promise<number> {
      const [row] = await tx
        .select({ n: count() })
        .from(followers)
        .where(and(...filterConditions(spaceId, filter)));
      return row?.n ?? 0;
    },

    /** FollowersPage.counts over the whole roster. */
    async counts(
      spaceId: string,
      tx: DbOrTx = db,
    ): Promise<{ all: number; untagged: number; joined: number }> {
      const [row] = await tx
        .select({
          all: count(),
          untagged: sql<number>`count(*) filter (where not ${activeTagExists})`.mapWith(Number),
          joined: sql<number>`count(${followers.membershipId})`.mapWith(Number),
        })
        .from(followers)
        .where(eq(followers.spaceId, spaceId));
      return { all: row?.all ?? 0, untagged: row?.untagged ?? 0, joined: row?.joined ?? 0 };
    },

    async findById(spaceId: string, id: string, tx: DbOrTx = db): Promise<FollowerWithJoin | null> {
      const rows = await withJoin(tx)
        .where(and(eq(followers.spaceId, spaceId), eq(followers.id, id)))
        .limit(1);
      return flatten(rows)[0] ?? null;
    },

    /** Only rows of this space (foreign ids are dropped). */
    async findManyByIds(spaceId: string, ids: string[], tx: DbOrTx = db): Promise<FollowerRow[]> {
      if (ids.length === 0) return [];
      return tx
        .select()
        .from(followers)
        .where(and(eq(followers.spaceId, spaceId), inArray(followers.id, ids)))
        .orderBy(desc(followers.createdAt), desc(followers.id));
    },

    /**
     * Auto-tag targets: followers with no tag in an active community, those with a note first
     * (so noteless ones never crowd them out of `limit`), then oldest first. Followers the model
     * already saw (ai_tagged_at) are skipped until a community is added or archived after that.
     */
    async listUntagged(spaceId: string, limit: number, tx: DbOrTx = db): Promise<FollowerRow[]> {
      return tx
        .select()
        .from(followers)
        .where(
          and(
            eq(followers.spaceId, spaceId),
            sql`not ${activeTagExists}`,
            sql`(${qcol(followers.aiTaggedAt)} is null or ${qcol(followers.aiTaggedAt)} < (
              select max(greatest(${qcol(communities.createdAt)}, coalesce(${qcol(communities.archivedAt)}, ${qcol(communities.createdAt)})))
              from ${communities} where ${qcol(communities.spaceId)} = ${qcol(followers.spaceId)}
            ))`,
          ),
        )
        .orderBy(sql`${followers.note} is null`, asc(followers.createdAt), asc(followers.id))
        .limit(limit);
    },

    /** Stamps followers the model has just seen (auto-tag). */
    async markAiTagged(ids: string[], tx: DbOrTx = db): Promise<void> {
      if (ids.length === 0) return;
      await tx.update(followers).set({ aiTaggedAt: sql`now()` }).where(inArray(followers.id, ids));
    },

    async countBySpace(spaceId: string, tx: DbOrTx = db): Promise<number> {
      const [row] = await tx
        .select({ n: count() })
        .from(followers)
        .where(eq(followers.spaceId, spaceId));
      return row?.n ?? 0;
    },

    /** Serializes roster writes of one space for the rest of `tx` (the perSpace cap). */
    async lockRoster(spaceId: string, tx: DbOrTx): Promise<void> {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`followers:${spaceId}`}, 0))`,
      );
    },

    /** Existing followers sharing an email or a handle with the batch (import dedupe). */
    async findClashes(
      spaceId: string,
      emails: string[],
      handles: string[],
      tx: DbOrTx = db,
    ): Promise<Array<Pick<FollowerRow, 'email' | 'platform' | 'handle'>>> {
      if (emails.length === 0 && handles.length === 0) return [];
      const lowered = handles.map((handle) => handle.toLowerCase());
      return tx
        .select({ email: followers.email, platform: followers.platform, handle: followers.handle })
        .from(followers)
        .where(
          and(
            eq(followers.spaceId, spaceId),
            sql`(${emails.length > 0 ? inArray(followers.email, emails) : sql`false`} or ${
              lowered.length > 0 ? inArray(sql`lower(${followers.handle})`, lowered) : sql`false`
            })`,
          ),
        );
    },

    /** Throws the unique violation on a duplicate email or platform + handle (service: 409). */
    async insert(values: NewFollowerRow, tx: DbOrTx = db): Promise<FollowerRow> {
      const [row] = await tx.insert(followers).values(values).returning();
      if (!row) throw new Error('follower insert returned no row');
      return row;
    },

    /** Import: inserts, skipping duplicates (on conflict do nothing). Returns the inserted rows. */
    async insertMany(values: NewFollowerRow[], tx: DbOrTx = db): Promise<FollowerRow[]> {
      const out: FollowerRow[] = [];
      for (const part of chunk(values)) {
        out.push(...(await tx.insert(followers).values(part).onConflictDoNothing().returning()));
      }
      return out;
    },

    async update(
      spaceId: string,
      id: string,
      patch: FollowerUpdate,
      tx: DbOrTx = db,
    ): Promise<FollowerRow | null> {
      if (Object.keys(patch).length === 0) {
        const [row] = await tx
          .select()
          .from(followers)
          .where(and(eq(followers.spaceId, spaceId), eq(followers.id, id)));
        return row ?? null;
      }
      const [row] = await tx
        .update(followers)
        .set(patch)
        .where(and(eq(followers.spaceId, spaceId), eq(followers.id, id)))
        .returning();
      return row ?? null;
    },

    async remove(spaceId: string, id: string, tx: DbOrTx = db): Promise<boolean> {
      const rows = await tx
        .delete(followers)
        .where(and(eq(followers.spaceId, spaceId), eq(followers.id, id)))
        .returning({ id: followers.id });
      return rows.length > 0;
    },

    /** Tags per follower in non-archived communities, ordered by community sort_order. */
    async tagsFor(followerIds: string[], tx: DbOrTx = db): Promise<Map<string, FollowerTagRow[]>> {
      const out = new Map<string, FollowerTagRow[]>();
      if (followerIds.length === 0) return out;
      const rows = await tx
        .select({
          followerId: followerCommunities.followerId,
          communityId: communities.id,
          slug: communities.slug,
          name: communities.name,
          tint: communities.tint,
          icon: communities.icon,
          taggedBy: followerCommunities.taggedBy,
        })
        .from(followerCommunities)
        .innerJoin(communities, eq(communities.id, followerCommunities.communityId))
        .where(
          and(inArray(followerCommunities.followerId, followerIds), isNull(communities.archivedAt)),
        )
        .orderBy(asc(communities.sortOrder), asc(communities.createdAt), asc(communities.id));
      for (const row of rows) {
        const list = out.get(row.followerId) ?? [];
        list.push(row);
        out.set(row.followerId, list);
      }
      return out;
    },

    /**
     * Replaces a follower's tags in active communities (PATCH communityIds). Tags in archived
     * communities are kept; kept tags become the creator's.
     */
    async replaceTags(
      followerId: string,
      communityIds: string[],
      taggedBy: FollowerTagger,
      tx: DbOrTx = db,
    ): Promise<void> {
      await tx.execute(sql`
        delete from ${followerCommunities}
        using ${communities}
        where ${qcol(communities.id)} = ${qcol(followerCommunities.communityId)}
          and ${qcol(communities.archivedAt)} is null
          and ${qcol(followerCommunities.followerId)} = ${followerId}
          ${communityIds.length > 0 ? sql`and not (${inArray(qcol(followerCommunities.communityId), communityIds)})` : sql``}
      `);
      if (communityIds.length === 0) return;
      await tx
        .insert(followerCommunities)
        .values(communityIds.map((communityId) => ({ followerId, communityId, taggedBy })))
        .onConflictDoUpdate({
          target: [followerCommunities.followerId, followerCommunities.communityId],
          set: { taggedBy },
        });
    },

    /**
     * Adds one community to many followers (POST /tag). Followers already tagged into
     * communitiesPerFollower active communities are skipped. Returns how many tags were new.
     */
    async addTag(
      followerIds: string[],
      communityId: string,
      taggedBy: FollowerTagger,
      tx: DbOrTx = db,
    ): Promise<number> {
      if (followerIds.length === 0) return 0;
      const rows = await tx.execute<{ follower_id: string }>(sql`
        insert into ${followerCommunities} (follower_id, community_id, tagged_by)
        select f.id, ${communityId}::uuid, ${taggedBy}
        from unnest(array[${sql.join(
          followerIds.map((id) => sql`${id}`),
          sql`, `,
        )}]::uuid[]) as f(id)
        where (
          select count(*) from ${followerCommunities} fc
          join ${communities} c on c.id = fc.community_id
          where fc.follower_id = f.id and c.archived_at is null
        ) < ${LIMITS.follower.communitiesPerFollower}
        on conflict do nothing
        returning follower_id
      `);
      return rows.length;
    },

    /** Inserts (follower, community) tags, keeping existing ones as they are. Returns the new ones. */
    async addTags(
      pairs: Array<{ followerId: string; communityId: string }>,
      taggedBy: FollowerTagger,
      tx: DbOrTx = db,
    ): Promise<Array<{ followerId: string; communityId: string }>> {
      const out: Array<{ followerId: string; communityId: string }> = [];
      for (const part of chunk(pairs)) {
        out.push(
          ...(await tx
            .insert(followerCommunities)
            .values(part.map((pair) => ({ ...pair, taggedBy })))
            .onConflictDoNothing()
            .returning({
              followerId: followerCommunities.followerId,
              communityId: followerCommunities.communityId,
            })),
        );
      }
      return out;
    },

    /** Removes one community from many followers; returns how many tags were removed. */
    async removeTag(followerIds: string[], communityId: string, tx: DbOrTx = db): Promise<number> {
      if (followerIds.length === 0) return 0;
      const rows = await tx
        .delete(followerCommunities)
        .where(
          and(
            eq(followerCommunities.communityId, communityId),
            inArray(followerCommunities.followerId, followerIds),
          ),
        )
        .returning({ followerId: followerCommunities.followerId });
      return rows.length;
    },

    async insertImport(values: NewImportRow, tx: DbOrTx = db): Promise<ImportRow> {
      const [row] = await tx.insert(imports).values(values).returning();
      if (!row) throw new Error('import insert returned no row');
      return row;
    },

    async updateImport(
      id: string,
      patch: Partial<Pick<NewImportRow, 'status' | 'itemCount' | 'result'>>,
      tx: DbOrTx = db,
    ): Promise<void> {
      await tx.update(imports).set(patch).where(eq(imports.id, id));
    },

    /**
     * Links the first unlinked follower matching the user (same email, else same platform +
     * handle from user.social_platform / social_handle) to the membership, unless the membership
     * is already linked. Returns the linked follower, or null.
     */
    async linkMembership(
      spaceId: string,
      membershipId: string,
      userId: string,
      tx: DbOrTx = db,
    ): Promise<FollowerRow | null> {
      const emailMatch = sql`${qcol(followers.email)} = lower(${qcol(user.email)})`;
      const handleMatch = sql`(${qcol(user.socialHandle)} is not null and ${qcol(followers.platform)} = ${qcol(user.socialPlatform)} and lower(${qcol(followers.handle)}) = lower(ltrim(${qcol(user.socialHandle)}, '@')))`;
      const [row] = await tx
        .update(followers)
        .set({ membershipId })
        .where(
          sql`${followers.id} = (
            select ${qcol(followers.id)} from ${followers}, ${user}
            where ${qcol(user.id)} = ${userId}
              and ${qcol(followers.spaceId)} = ${spaceId}
              and ${qcol(followers.membershipId)} is null
              and (${emailMatch} or ${handleMatch})
              and not exists (select 1 from ${followers} linked where linked.membership_id = ${membershipId})
            order by (${emailMatch}) desc, ${qcol(followers.createdAt)}
            limit 1
          )`,
        )
        .returning();
      return row ?? null;
    },

    /**
     * Backfill of linkMembership for fans who joined before they were listed: links every unlinked
     * follower of the space to an unlinked active member (role member, not removed, joined at
     * least one community, so a pitch-only membership stays private) with the same match rule.
     * One link per follower and per membership: each follower takes its best membership (email
     * first, then earliest joined), each membership its best follower (email first, then oldest),
     * so the unique membership index never trips. Returns how many followers were linked.
     */
    async linkJoined(spaceId: string, tx: DbOrTx = db): Promise<number> {
      const rows = await tx.execute<{ id: string }>(sql`
        update ${followers} set membership_id = pick.membership_id
        from (
          select distinct on (c.membership_id) c.follower_id, c.membership_id
          from (
            select distinct on (f.id) f.id as follower_id, m.id as membership_id,
              f.created_at, (f.email = lower(u.email)) as by_email
            from ${followers} f
            join ${memberships} m on m.space_id = f.space_id
              and m.role = 'member' and m.removed_at is null
            join ${user} u on u.id = m.user_id
            where f.space_id = ${spaceId}
              and f.membership_id is null
              and (f.email = lower(u.email)
                or (u.social_handle is not null and f.platform = u.social_platform
                  and lower(f.handle) = lower(ltrim(u.social_handle, '@'))))
              and exists (select 1 from ${communityMembers} cm where cm.membership_id = m.id)
              and not exists (select 1 from ${followers} l where l.membership_id = m.id)
            order by f.id, (f.email = lower(u.email)) is true desc, m.joined_at, m.id
          ) c
          order by c.membership_id, c.by_email is true desc, c.created_at, c.follower_id
        ) pick
        where ${qcol(followers.id)} = pick.follower_id
        returning ${qcol(followers.id)} as id
      `);
      return rows.length;
    },

    /**
     * Drops a follower's link when its own email and platform + handle no longer match the linked
     * member (after the creator edits them). Returns true when a link was dropped.
     */
    async unlinkMismatch(spaceId: string, id: string, tx: DbOrTx = db): Promise<boolean> {
      const rows = await tx.execute<{ id: string }>(sql`
        update ${followers} set membership_id = null
        from ${memberships} m join ${user} u on u.id = m.user_id
        where ${qcol(followers.id)} = ${id}
          and ${qcol(followers.spaceId)} = ${spaceId}
          and m.id = ${qcol(followers.membershipId)}
          and not coalesce(${qcol(followers.email)} = lower(u.email), false)
          and not coalesce(u.social_handle is not null and ${qcol(followers.platform)} = u.social_platform
            and lower(${qcol(followers.handle)}) = lower(ltrim(u.social_handle, '@')), false)
        returning ${qcol(followers.id)} as id
      `);
      return rows.length > 0;
    },
  };
}

export type FollowersRepo = ReturnType<typeof createFollowersRepo>;
