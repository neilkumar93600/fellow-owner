import type { AnalysisStatus, Tint } from '@fellow-owners/shared';
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  lt,
  ne,
  or,
  sql,
} from 'drizzle-orm';
import { chunk, type Db, type DbOrTx, inTransaction, likePattern, qcol } from '../db/client.js';
import { type NewUserRow, user } from '../db/schema/auth.js';
import {
  communities,
  communityMembers,
  type NewCommunityMemberRow,
} from '../db/schema/communities.js';
import { inbound } from '../db/schema/inbound.js';
import {
  type MembershipRow,
  memberships,
  type NewMembershipRow,
} from '../db/schema/memberships.js';
import { posts } from '../db/schema/posts.js';
import { comments, LEAD_ROLE, teamMembers } from '../db/schema/social.js';

/** Fields a member edits on their own profile (PATCH /api/spaces/:handle/me). */
export type MembershipUpdate = Partial<
  Pick<NewMembershipRow, 'headline' | 'intro' | 'skills' | 'links' | 'embedding'>
>;

/**
 * The person behind a membership as others see them (MemberRef): user name and image plus the
 * space profile headline. Never an email.
 */
export interface MemberRefRow {
  membershipId: string;
  userId: string;
  name: string;
  headline: string | null;
  image: string | null;
  removed: boolean;
}

export interface CommunityBadge {
  id: string;
  slug: string;
  name: string;
  tint: Tint;
}

export interface ContributionCounts {
  /** Posts authored, not deleted. */
  posts: number;
  /** Comments authored, not deleted. */
  comments: number;
  /** use + build signals received on their posts (not deleted). */
  signalsReceived: number;
  /** Accepted team joins on other people's projects (Lead rows excluded). */
  teams: number;
}

/** A row of the studio People table before mapping to PersonRow. */
export interface PersonStatsRow extends ContributionCounts {
  membershipId: string;
  userId: string;
  name: string;
  image: string | null;
  headline: string | null;
  intro: string | null;
  skills: string[];
  links: MembershipRow['links'];
  joinedAt: Date;
}

export interface SpotlightRow {
  membershipId: string;
  name: string;
  image: string | null;
  note: string;
  spotlightAt: Date;
  communityName: string | null;
}

export interface PeopleFilter {
  /** Matches skills (exact via GIN, partial via ILIKE), headline, intro, name and post text. */
  q?: string | undefined;
  communityId?: string | undefined;
  offset?: number;
  limit: number;
}

export interface RisingInput {
  membershipId: string;
  posts: Array<{
    aiFitScore: number | null;
    analysisStatus: AnalysisStatus;
    signalsReceived: number;
  }>;
  acceptedTeamJoins: number;
}

export interface WeeklyCount {
  weekStart: Date;
  count: number;
}

const activeMember = (spaceId: string) =>
  and(eq(memberships.spaceId, spaceId), isNull(memberships.removedAt));

export function createMembershipsRepo(db: Db) {
  // Correlated contribution subqueries over the outer `memberships` row.
  const contribution = {
    posts: sql<number>`(
      select count(*)::int from ${posts}
      where ${qcol(posts.authorMembershipId)} = ${qcol(memberships.id)}
        and ${qcol(posts.deletedAt)} is null
    )`,
    comments: sql<number>`(
      select count(*)::int from ${comments}
      where ${qcol(comments.authorMembershipId)} = ${qcol(memberships.id)}
        and ${qcol(comments.deletedAt)} is null
    )`,
    signalsReceived: sql<number>`(
      select coalesce(sum(${qcol(posts.useCount)} + ${qcol(posts.buildCount)}), 0)::int from ${posts}
      where ${qcol(posts.authorMembershipId)} = ${qcol(memberships.id)}
        and ${qcol(posts.deletedAt)} is null
    )`,
    teams: sql<number>`(
      select count(*)::int from ${teamMembers}
      where ${qcol(teamMembers.membershipId)} = ${qcol(memberships.id)}
        and ${qcol(teamMembers.status)} = 'accepted' and ${qcol(teamMembers.role)} <> ${LEAD_ROLE}
    )`,
  };

  async function changeCounts(
    spaceId: string,
    communityIds: string[],
    delta: number,
    tx: DbOrTx,
  ): Promise<void> {
    if (communityIds.length === 0) return;
    await tx
      .update(communities)
      .set({ memberCount: sql`greatest(0, ${communities.memberCount} + ${delta})` })
      .where(and(eq(communities.spaceId, spaceId), inArray(communities.id, communityIds)));
  }

  async function addCommunities(
    spaceId: string,
    membershipId: string,
    communityIds: string[],
    tx?: DbOrTx,
  ): Promise<string[]> {
    if (communityIds.length === 0) return [];
    return inTransaction(db, tx, async (t) => {
      const added = await t
        .insert(communityMembers)
        .values(communityIds.map((communityId) => ({ communityId, membershipId })))
        .onConflictDoNothing()
        .returning({ communityId: communityMembers.communityId });
      const ids = added.map((row) => row.communityId);
      await changeCounts(spaceId, ids, 1, t);
      return ids;
    });
  }

  async function removeCommunities(
    spaceId: string,
    membershipId: string,
    communityIds: string[],
    tx?: DbOrTx,
  ): Promise<string[]> {
    if (communityIds.length === 0) return [];
    return inTransaction(db, tx, async (t) => {
      const removed = await t
        .delete(communityMembers)
        .where(
          and(
            eq(communityMembers.membershipId, membershipId),
            inArray(communityMembers.communityId, communityIds),
          ),
        )
        .returning({ communityId: communityMembers.communityId });
      const ids = removed.map((row) => row.communityId);
      await changeCounts(spaceId, ids, -1, t);
      return ids;
    });
  }

  async function communityIdsOf(membershipId: string, tx: DbOrTx = db): Promise<string[]> {
    const rows = await tx
      .select({ communityId: communityMembers.communityId })
      .from(communityMembers)
      .where(eq(communityMembers.membershipId, membershipId))
      .orderBy(asc(communityMembers.joinedAt));
    return rows.map((row) => row.communityId);
  }

  return {
    async findById(spaceId: string, id: string, tx: DbOrTx = db): Promise<MembershipRow | null> {
      const [row] = await tx
        .select()
        .from(memberships)
        .where(and(eq(memberships.spaceId, spaceId), eq(memberships.id, id)))
        .limit(1);
      return row ?? null;
    },

    /** The user's membership in the space, removed ones included (check `removedAt`). */
    async findByUser(
      spaceId: string,
      userId: string,
      tx: DbOrTx = db,
    ): Promise<MembershipRow | null> {
      const [row] = await tx
        .select()
        .from(memberships)
        .where(and(eq(memberships.spaceId, spaceId), eq(memberships.userId, userId)))
        .limit(1);
      return row ?? null;
    },

    async findOwner(spaceId: string, tx: DbOrTx = db): Promise<MembershipRow | null> {
      const [row] = await tx
        .select()
        .from(memberships)
        .where(and(eq(memberships.spaceId, spaceId), eq(memberships.role, 'owner')))
        .limit(1);
      return row ?? null;
    },

    async insert(values: NewMembershipRow, tx: DbOrTx = db): Promise<MembershipRow> {
      const [row] = await tx.insert(memberships).values(values).returning();
      if (!row) throw new Error('insert into memberships returned no row');
      return row;
    },

    /**
     * Join / first pitch: inserts the membership unless the user already has one in the space
     * (unique space_id + user_id), in which case the existing row (removed or not) is returned.
     * Safe under concurrent requests.
     */
    async insertOrGet(
      values: NewMembershipRow,
      tx: DbOrTx = db,
    ): Promise<{ row: MembershipRow; created: boolean }> {
      const [inserted] = await tx
        .insert(memberships)
        .values(values)
        .onConflictDoNothing({ target: [memberships.spaceId, memberships.userId] })
        .returning();
      if (inserted) return { row: inserted, created: true };
      const [existing] = await tx
        .select()
        .from(memberships)
        .where(and(eq(memberships.spaceId, values.spaceId), eq(memberships.userId, values.userId)))
        .limit(1);
      if (!existing) throw new Error('membership insert conflicted but no row was found');
      return { row: existing, created: false };
    },

    /**
     * Transaction-scoped advisory lock on (space, user). Daily-cap checks take it before counting
     * and inserting, so two concurrent writes by the same user cannot both pass the cap.
     * Must run inside a transaction (released at commit/rollback).
     */
    async lockUserInSpace(spaceId: string, userId: string, tx: DbOrTx): Promise<void> {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`caps:${spaceId}:${userId}`}, 0))`,
      );
    },

    /** People-table rows (PersonStatsRow) for specific memberships of the space (rising strip). */
    async peopleByIds(
      spaceId: string,
      membershipIds: string[],
      tx: DbOrTx = db,
    ): Promise<PersonStatsRow[]> {
      const ids = [...new Set(membershipIds)];
      if (ids.length === 0) return [];
      return tx
        .select({
          membershipId: memberships.id,
          userId: memberships.userId,
          name: user.name,
          image: user.image,
          headline: memberships.headline,
          intro: memberships.intro,
          skills: memberships.skills,
          links: memberships.links,
          joinedAt: memberships.joinedAt,
          posts: contribution.posts,
          comments: contribution.comments,
          signalsReceived: contribution.signalsReceived,
          teams: contribution.teams,
        })
        .from(memberships)
        .innerJoin(user, eq(user.id, memberships.userId))
        .where(and(eq(memberships.spaceId, spaceId), inArray(memberships.id, ids)));
    },

    async insertMany(values: NewMembershipRow[], tx: DbOrTx = db): Promise<MembershipRow[]> {
      const out: MembershipRow[] = [];
      for (const part of chunk(values)) {
        out.push(...(await tx.insert(memberships).values(part).returning()));
      }
      return out;
    },

    async update(
      spaceId: string,
      id: string,
      patch: MembershipUpdate,
      tx: DbOrTx = db,
    ): Promise<MembershipRow | null> {
      if (Object.keys(patch).length === 0) {
        const [row] = await tx
          .select()
          .from(memberships)
          .where(and(eq(memberships.spaceId, spaceId), eq(memberships.id, id)))
          .limit(1);
        return row ?? null;
      }
      const [row] = await tx
        .update(memberships)
        .set(patch)
        .where(and(eq(memberships.spaceId, spaceId), eq(memberships.id, id)))
        .returning();
      return row ?? null;
    },

    /**
     * Owner removes a member: sets removed_at, leaves every community (member_count kept in sync).
     * Returns false when there was no active membership with that id. Never call it for the owner.
     */
    async remove(spaceId: string, id: string, tx?: DbOrTx): Promise<boolean> {
      return inTransaction(db, tx, async (t) => {
        const [row] = await t
          .update(memberships)
          .set({ removedAt: new Date() })
          .where(and(activeMember(spaceId), eq(memberships.id, id), ne(memberships.role, 'owner')))
          .returning({ id: memberships.id });
        if (!row) return false;
        const left = await t
          .delete(communityMembers)
          .where(eq(communityMembers.membershipId, id))
          .returning({ communityId: communityMembers.communityId });
        await changeCounts(
          spaceId,
          left.map((r) => r.communityId),
          -1,
          t,
        );
        return true;
      });
    },

    /** Joined community ids, in join order. */
    communityIds: communityIdsOf,

    async communityIdsMany(
      membershipIds: string[],
      tx: DbOrTx = db,
    ): Promise<Map<string, string[]>> {
      const out = new Map<string, string[]>(membershipIds.map((id) => [id, []]));
      if (membershipIds.length === 0) return out;
      const rows = await tx
        .select({
          membershipId: communityMembers.membershipId,
          communityId: communityMembers.communityId,
        })
        .from(communityMembers)
        .where(inArray(communityMembers.membershipId, membershipIds))
        .orderBy(asc(communityMembers.joinedAt));
      for (const row of rows) out.get(row.membershipId)?.push(row.communityId);
      return out;
    },

    /** Joined communities (slug, name, tint) per membership, archived excluded. */
    async communitiesFor(
      membershipIds: string[],
      tx: DbOrTx = db,
    ): Promise<Map<string, CommunityBadge[]>> {
      const out = new Map<string, CommunityBadge[]>(membershipIds.map((id) => [id, []]));
      if (membershipIds.length === 0) return out;
      const rows = await tx
        .select({
          membershipId: communityMembers.membershipId,
          id: communities.id,
          slug: communities.slug,
          name: communities.name,
          tint: communities.tint,
        })
        .from(communityMembers)
        .innerJoin(communities, eq(communities.id, communityMembers.communityId))
        .where(
          and(
            inArray(communityMembers.membershipId, membershipIds),
            isNull(communities.archivedAt),
          ),
        )
        .orderBy(asc(communities.sortOrder), asc(communities.createdAt));
      for (const { membershipId, ...badge } of rows) out.get(membershipId)?.push(badge);
      return out;
    },

    /**
     * Owner shout-out (F6): sets the note and spotlight_at = now on an active fan of the space.
     * Null when there is no such fan (owner, removed or another space).
     */
    async setSpotlight(
      spaceId: string,
      id: string,
      note: string,
      tx: DbOrTx = db,
    ): Promise<MembershipRow | null> {
      const [row] = await tx
        .update(memberships)
        .set({ spotlightNote: note, spotlightAt: new Date() })
        .where(and(eq(memberships.id, id), activeMember(spaceId), ne(memberships.role, 'owner')))
        .returning();
      return row ?? null;
    },

    /** Clears the shout-out. False when there is no such fan. */
    async clearSpotlight(spaceId: string, id: string, tx: DbOrTx = db): Promise<boolean> {
      const rows = await tx
        .update(memberships)
        .set({ spotlightNote: null, spotlightAt: null })
        .where(and(eq(memberships.id, id), activeMember(spaceId), ne(memberships.role, 'owner')))
        .returning({ id: memberships.id });
      return rows.length > 0;
    },

    /**
     * "Fans of the week": active fans with a shout-out, newest first, each with their first
     * joined community (sort order). `membershipId` narrows to one fan.
     */
    async listSpotlights(
      spaceId: string,
      { limit = 6, membershipId }: { limit?: number; membershipId?: string } = {},
      tx: DbOrTx = db,
    ): Promise<SpotlightRow[]> {
      const rows = await tx
        .select({
          membershipId: memberships.id,
          name: user.name,
          image: user.image,
          note: memberships.spotlightNote,
          spotlightAt: memberships.spotlightAt,
          communityName: sql<string | null>`(
            select ${communities.name} from ${communityMembers}
            join ${communities} on ${communities.id} = ${communityMembers.communityId}
            where ${communityMembers.membershipId} = ${memberships.id} and ${communities.archivedAt} is null
            order by ${communities.sortOrder}, ${communities.createdAt} limit 1)`,
        })
        .from(memberships)
        .innerJoin(user, eq(user.id, memberships.userId))
        .where(
          and(
            activeMember(spaceId),
            isNotNull(memberships.spotlightAt),
            isNotNull(memberships.spotlightNote),
            membershipId ? eq(memberships.id, membershipId) : undefined,
          ),
        )
        .orderBy(desc(memberships.spotlightAt), asc(memberships.id))
        .limit(limit);
      return rows.flatMap(({ note, spotlightAt, ...rest }) =>
        note !== null && spotlightAt !== null ? [{ ...rest, note, spotlightAt }] : [],
      );
    },

    /** Joins communities (ignores ones already joined); returns the ids actually added. */
    addCommunities,
    /** Leaves communities; returns the ids actually removed. */
    removeCommunities,

    /** Makes the joined set exactly `communityIds` (PATCH me `communityIds`). */
    async replaceCommunities(
      spaceId: string,
      membershipId: string,
      communityIds: string[],
      tx?: DbOrTx,
    ): Promise<{ added: string[]; removed: string[] }> {
      return inTransaction(db, tx, async (t) => {
        const current = new Set(await communityIdsOf(membershipId, t));
        const wanted = new Set(communityIds);
        const toAdd = [...wanted].filter((id) => !current.has(id));
        const toRemove = [...current].filter((id) => !wanted.has(id));
        const added = await addCommunities(spaceId, membershipId, toAdd, t);
        const removed = await removeCommunities(spaceId, membershipId, toRemove, t);
        return { added, removed };
      });
    },

    /** Bulk community_members insert without counter updates (seed; follow with recountMembers). */
    async insertCommunityMembers(rows: NewCommunityMemberRow[], tx: DbOrTx = db): Promise<void> {
      for (const part of chunk(rows, 1000)) {
        await tx.insert(communityMembers).values(part).onConflictDoNothing();
      }
    },

    /** MemberRef data for many memberships (user name/image + headline). */
    async refs(membershipIds: string[], tx: DbOrTx = db): Promise<Map<string, MemberRefRow>> {
      const out = new Map<string, MemberRefRow>();
      const ids = [...new Set(membershipIds)];
      if (ids.length === 0) return out;
      const rows = await tx
        .select({
          membershipId: memberships.id,
          userId: memberships.userId,
          name: user.name,
          headline: memberships.headline,
          image: user.image,
          removedAt: memberships.removedAt,
        })
        .from(memberships)
        .innerJoin(user, eq(user.id, memberships.userId))
        .where(inArray(memberships.id, ids));
      for (const { removedAt, ...row } of rows) {
        out.set(row.membershipId, { ...row, removed: removedAt !== null });
      }
      return out;
    },

    /** Active memberships (removed_at null). Owner excluded unless includeOwner. */
    async countActive(
      spaceId: string,
      { includeOwner = false }: { includeOwner?: boolean } = {},
      tx: DbOrTx = db,
    ): Promise<number> {
      const [row] = await tx
        .select({ n: count() })
        .from(memberships)
        .where(
          and(activeMember(spaceId), includeOwner ? undefined : eq(memberships.role, 'member')),
        );
      return row?.n ?? 0;
    },

    /** Members as of `at`: joined by then and not removed by then (Members trend). */
    async countActiveAt(
      spaceId: string,
      at: Date,
      { includeOwner = false }: { includeOwner?: boolean } = {},
      tx: DbOrTx = db,
    ): Promise<number> {
      const [row] = await tx
        .select({ n: count() })
        .from(memberships)
        .where(
          and(
            eq(memberships.spaceId, spaceId),
            lt(memberships.joinedAt, at),
            or(isNull(memberships.removedAt), gte(memberships.removedAt, at)),
            includeOwner ? undefined : eq(memberships.role, 'member'),
          ),
        );
      return row?.n ?? 0;
    },

    /** Member joins (role member) with joined_at in [from, to). Both bounds optional. */
    async countJoined(
      spaceId: string,
      { from, to }: { from?: Date; to?: Date } = {},
      tx: DbOrTx = db,
    ): Promise<number> {
      const [row] = await tx
        .select({ n: count() })
        .from(memberships)
        .where(
          and(
            eq(memberships.spaceId, spaceId),
            eq(memberships.role, 'member'),
            from ? gte(memberships.joinedAt, from) : undefined,
            to ? lt(memberships.joinedAt, to) : undefined,
          ),
        );
      return row?.n ?? 0;
    },

    /** Member joins per ISO week (Monday 00:00 UTC) since `from`; weeks with none are absent. */
    async weeklyJoins(spaceId: string, from: Date, tx: DbOrTx = db): Promise<WeeklyCount[]> {
      const week = sql<string>`to_char(date_trunc('week', ${memberships.joinedAt} at time zone 'UTC'), 'YYYY-MM-DD')`;
      const rows = await tx
        .select({ week, n: count() })
        .from(memberships)
        .where(
          and(
            eq(memberships.spaceId, spaceId),
            eq(memberships.role, 'member'),
            gte(memberships.joinedAt, from),
          ),
        )
        .groupBy(week)
        .orderBy(week);
      return rows.map((row) => ({
        weekStart: new Date(`${row.week}T00:00:00.000Z`),
        count: row.n,
      }));
    },

    /** Contribution counts for specific memberships (rising strip, community members). */
    async contributions(
      membershipIds: string[],
      tx: DbOrTx = db,
    ): Promise<Map<string, ContributionCounts>> {
      const out = new Map<string, ContributionCounts>();
      if (membershipIds.length === 0) return out;
      const rows = await tx
        .select({
          membershipId: memberships.id,
          posts: contribution.posts,
          comments: contribution.comments,
          signalsReceived: contribution.signalsReceived,
          teams: contribution.teams,
        })
        .from(memberships)
        .where(inArray(memberships.id, membershipIds));
      for (const { membershipId, ...counts } of rows) out.set(membershipId, counts);
      return out;
    },

    /**
     * Studio People: active members (owner excluded) ranked by total contributions
     * (posts + comments + signals received + team joins), then newest join. Offset paging.
     */
    async listPeople(
      spaceId: string,
      filter: PeopleFilter,
      tx: DbOrTx = db,
    ): Promise<{ rows: PersonStatsRow[]; total: number }> {
      const q = filter.q?.trim();
      const pattern = q ? likePattern(q) : null;
      const conditions = and(
        activeMember(spaceId),
        eq(memberships.role, 'member'),
        filter.communityId
          ? sql`exists (select 1 from ${communityMembers} where ${qcol(communityMembers.membershipId)} = ${qcol(memberships.id)} and ${qcol(communityMembers.communityId)} = ${filter.communityId})`
          : undefined,
        q && pattern
          ? sql`(
              ${qcol(memberships.skills)} @> array[${q.toLowerCase()}]::text[]
              or exists (select 1 from unnest(${qcol(memberships.skills)}) as skill where skill ilike ${pattern})
              or ${qcol(memberships.headline)} ilike ${pattern}
              or ${qcol(memberships.intro)} ilike ${pattern}
              or ${qcol(user.name)} ilike ${pattern}
              or exists (
                select 1 from ${posts}
                where ${qcol(posts.authorMembershipId)} = ${qcol(memberships.id)}
                  and ${qcol(posts.deletedAt)} is null
                  and (${qcol(posts.title)} ilike ${pattern} or ${qcol(posts.body)} ilike ${pattern})
              )
            )`
          : undefined,
      );

      const base = tx.$with('people').as(
        tx
          .select({
            membershipId: sql<string>`${memberships.id}`.as('membership_id'),
            userId: sql<string>`${memberships.userId}`.as('user_id'),
            name: sql<string>`${user.name}`.as('name'),
            image: sql<string | null>`${user.image}`.as('image'),
            headline: sql<string | null>`${memberships.headline}`.as('headline'),
            intro: sql<string | null>`${memberships.intro}`.as('intro'),
            skills: sql<string[]>`${memberships.skills}`.as('skills'),
            links: sql<MembershipRow['links']>`${memberships.links}`.as('links'),
            joinedAt: sql<Date>`${memberships.joinedAt}`.as('joined_at'),
            posts: contribution.posts.as('posts'),
            comments: contribution.comments.as('comments'),
            signalsReceived: contribution.signalsReceived.as('signals_received'),
            teams: contribution.teams.as('teams'),
          })
          .from(memberships)
          .innerJoin(user, eq(user.id, memberships.userId))
          .where(conditions),
      );

      const rows = await tx
        .with(base)
        .select({
          membershipId: base.membershipId,
          userId: base.userId,
          name: base.name,
          image: base.image,
          headline: base.headline,
          intro: base.intro,
          skills: base.skills,
          links: base.links,
          joinedAt: base.joinedAt,
          posts: base.posts,
          comments: base.comments,
          signalsReceived: base.signalsReceived,
          teams: base.teams,
          total: sql<number>`count(*) over ()`.mapWith(Number),
        })
        .from(base)
        .orderBy(
          sql`(${base.posts} + ${base.comments} + ${base.signalsReceived} + ${base.teams}) desc`,
          desc(base.joinedAt),
          desc(base.membershipId),
        )
        .limit(filter.limit)
        .offset(filter.offset ?? 0);

      const total = rows[0]?.total ?? 0;
      return {
        rows: rows.map(({ total: _total, joinedAt, ...row }) => ({
          ...row,
          joinedAt: joinedAt instanceof Date ? joinedAt : new Date(joinedAt),
        })),
        total,
      };
    },

    /**
     * Inputs for the rising score (02-trd): posts created since `since` by active members with
     * their fit and signals, plus accepted team joins (Lead excluded) decided since `since`.
     * Members with neither are absent.
     */
    async risingInputs(spaceId: string, since: Date, tx: DbOrTx = db): Promise<RisingInput[]> {
      const postRows = await tx
        .select({
          membershipId: posts.authorMembershipId,
          aiFitScore: posts.aiFitScore,
          analysisStatus: posts.analysisStatus,
          signalsReceived: sql<number>`(${posts.useCount} + ${posts.buildCount})::int`,
        })
        .from(posts)
        .innerJoin(memberships, eq(memberships.id, posts.authorMembershipId))
        .where(
          and(
            eq(posts.spaceId, spaceId),
            gte(posts.createdAt, since),
            isNull(posts.deletedAt),
            isNull(memberships.removedAt),
            eq(memberships.role, 'member'),
          ),
        );
      const teamRows = await tx
        .select({ membershipId: teamMembers.membershipId, n: count() })
        .from(teamMembers)
        .innerJoin(posts, eq(posts.id, teamMembers.postId))
        .innerJoin(memberships, eq(memberships.id, teamMembers.membershipId))
        .where(
          and(
            eq(posts.spaceId, spaceId),
            eq(teamMembers.status, 'accepted'),
            ne(teamMembers.role, LEAD_ROLE),
            sql`coalesce(${teamMembers.decidedAt}, ${teamMembers.createdAt}) >= ${since.toISOString()}::timestamptz`,
            isNull(memberships.removedAt),
            eq(memberships.role, 'member'),
          ),
        )
        .groupBy(teamMembers.membershipId);

      const byMember = new Map<string, RisingInput>();
      const entry = (membershipId: string) => {
        let found = byMember.get(membershipId);
        if (!found) {
          found = { membershipId, posts: [], acceptedTeamJoins: 0 };
          byMember.set(membershipId, found);
        }
        return found;
      };
      for (const row of postRows) {
        if (!row.membershipId) continue;
        entry(row.membershipId).posts.push({
          aiFitScore: row.aiFitScore,
          analysisStatus: row.analysisStatus,
          signalsReceived: row.signalsReceived,
        });
      }
      for (const row of teamRows) entry(row.membershipId).acceptedTeamJoins = row.n;
      return [...byMember.values()];
    },

    /** Pitch and post totals for the inbox side panel's sender profile. */
    async senderCounts(
      spaceId: string,
      membershipId: string,
      tx: DbOrTx = db,
    ): Promise<{ pitchCount: number; postCount: number }> {
      const [pitchRow] = await tx
        .select({ n: count() })
        .from(inbound)
        .where(and(eq(inbound.spaceId, spaceId), eq(inbound.senderMembershipId, membershipId)));
      const [postRow] = await tx
        .select({ n: count() })
        .from(posts)
        .where(
          and(
            eq(posts.spaceId, spaceId),
            eq(posts.authorMembershipId, membershipId),
            isNull(posts.deletedAt),
          ),
        );
      return { pitchCount: pitchRow?.n ?? 0, postCount: postRow?.n ?? 0 };
    },

    /** Seed only: users are normally created by Better Auth. Existing emails are skipped. */
    async insertUsers(rows: NewUserRow[], tx: DbOrTx = db): Promise<void> {
      for (const part of chunk(rows)) {
        await tx.insert(user).values(part).onConflictDoNothing();
      }
    },
  };
}

export type MembershipsRepo = ReturnType<typeof createMembershipsRepo>;
