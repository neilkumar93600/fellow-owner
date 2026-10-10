import type { TeamStatus } from '@fellow-owners/shared';
import { and, asc, count, eq, inArray, sql } from 'drizzle-orm';
import { chunk, type Db, type DbOrTx } from '../db/client.js';
import { user } from '../db/schema/auth.js';
import { memberships } from '../db/schema/memberships.js';
import { posts } from '../db/schema/posts.js';
import {
  LEAD_ROLE,
  type NewTeamMemberRow,
  type TeamMemberRow,
  teamMembers,
} from '../db/schema/social.js';

export { LEAD_ROLE };

/** A team row with the member's MemberRef fields. */
export interface TeamMemberWithRef extends TeamMemberRow {
  name: string;
  headline: string | null;
  image: string | null;
}

/** A team the member is on, with the post's space for scoping (MySpace.teams). */
export interface MembershipTeamRow extends TeamMemberRow {
  postSpaceId: string;
}

const refColumns = {
  postId: teamMembers.postId,
  membershipId: teamMembers.membershipId,
  role: teamMembers.role,
  status: teamMembers.status,
  createdAt: teamMembers.createdAt,
  decidedAt: teamMembers.decidedAt,
  name: user.name,
  headline: memberships.headline,
  image: user.image,
};

// Lead first, then by request time.
const teamOrder = [
  sql`case when ${teamMembers.role} = ${LEAD_ROLE} then 0 else 1 end`,
  asc(teamMembers.createdAt),
  asc(teamMembers.membershipId),
];

export function createTeamsRepo(db: Db) {
  return {
    /** Request a role (or insert the Lead). Null when the member is already on this team. */
    async insert(values: NewTeamMemberRow, tx: DbOrTx = db): Promise<TeamMemberRow | null> {
      const [row] = await tx.insert(teamMembers).values(values).onConflictDoNothing().returning();
      return row ?? null;
    },

    /** Seed only. */
    async insertMany(values: NewTeamMemberRow[], tx: DbOrTx = db): Promise<void> {
      for (const part of chunk(values, 1000)) {
        await tx.insert(teamMembers).values(part).onConflictDoNothing();
      }
    },

    async find(
      postId: string,
      membershipId: string,
      tx: DbOrTx = db,
    ): Promise<TeamMemberRow | null> {
      const [row] = await tx
        .select()
        .from(teamMembers)
        .where(and(eq(teamMembers.postId, postId), eq(teamMembers.membershipId, membershipId)))
        .limit(1);
      return row ?? null;
    },

    /** Author decision: sets status and decided_at. */
    async decide(
      postId: string,
      membershipId: string,
      status: 'accepted' | 'declined',
      tx: DbOrTx = db,
    ): Promise<TeamMemberRow | null> {
      const [row] = await tx
        .update(teamMembers)
        .set({ status, decidedAt: new Date() })
        .where(and(eq(teamMembers.postId, postId), eq(teamMembers.membershipId, membershipId)))
        .returning();
      return row ?? null;
    },

    /** One post's team (Lead first), optionally only some statuses. */
    async listByPost(
      postId: string,
      { statuses }: { statuses?: TeamStatus[] } = {},
      tx: DbOrTx = db,
    ): Promise<TeamMemberWithRef[]> {
      return tx
        .select(refColumns)
        .from(teamMembers)
        .innerJoin(memberships, eq(memberships.id, teamMembers.membershipId))
        .innerJoin(user, eq(user.id, memberships.userId))
        .where(
          and(
            eq(teamMembers.postId, postId),
            statuses && statuses.length > 0 ? inArray(teamMembers.status, statuses) : undefined,
          ),
        )
        .orderBy(...teamOrder);
    },

    /** Teams of many posts (card previews use statuses: ['accepted']). */
    async listByPosts(
      postIds: string[],
      { statuses }: { statuses?: TeamStatus[] } = {},
      tx: DbOrTx = db,
    ): Promise<Map<string, TeamMemberWithRef[]>> {
      const out = new Map<string, TeamMemberWithRef[]>(postIds.map((id) => [id, []]));
      if (postIds.length === 0) return out;
      const rows = await tx
        .select(refColumns)
        .from(teamMembers)
        .innerJoin(memberships, eq(memberships.id, teamMembers.membershipId))
        .innerJoin(user, eq(user.id, memberships.userId))
        .where(
          and(
            inArray(teamMembers.postId, postIds),
            statuses && statuses.length > 0 ? inArray(teamMembers.status, statuses) : undefined,
          ),
        )
        .orderBy(...teamOrder);
      for (const row of rows) out.get(row.postId)?.push(row);
      return out;
    },

    /** Accepted team size per post (Lead included). */
    async acceptedCounts(postIds: string[], tx: DbOrTx = db): Promise<Map<string, number>> {
      const out = new Map<string, number>(postIds.map((id) => [id, 0]));
      if (postIds.length === 0) return out;
      const rows = await tx
        .select({ postId: teamMembers.postId, n: count() })
        .from(teamMembers)
        .where(and(inArray(teamMembers.postId, postIds), eq(teamMembers.status, 'accepted')))
        .groupBy(teamMembers.postId);
      for (const row of rows) out.set(row.postId, row.n);
      return out;
    },

    /** Pending requests per role on one post (RoleSlot.requestCount). */
    async requestCounts(postId: string, tx: DbOrTx = db): Promise<Map<string, number>> {
      const rows = await tx
        .select({ role: teamMembers.role, n: count() })
        .from(teamMembers)
        .where(and(eq(teamMembers.postId, postId), eq(teamMembers.status, 'requested')))
        .groupBy(teamMembers.role);
      return new Map(rows.map((row) => [row.role, row.n]));
    },

    /** A role is filled when one accepted member holds it. */
    async isRoleFilled(postId: string, role: string, tx: DbOrTx = db): Promise<boolean> {
      const [row] = await tx
        .select({ postId: teamMembers.postId })
        .from(teamMembers)
        .where(
          and(
            eq(teamMembers.postId, postId),
            eq(teamMembers.role, role),
            eq(teamMembers.status, 'accepted'),
          ),
        )
        .limit(1);
      return Boolean(row);
    },

    /** Teams the member is on within the space (any status), newest first. */
    async listByMembership(
      spaceId: string,
      membershipId: string,
      tx: DbOrTx = db,
    ): Promise<MembershipTeamRow[]> {
      return tx
        .select({
          postId: teamMembers.postId,
          membershipId: teamMembers.membershipId,
          role: teamMembers.role,
          status: teamMembers.status,
          createdAt: teamMembers.createdAt,
          decidedAt: teamMembers.decidedAt,
          postSpaceId: posts.spaceId,
        })
        .from(teamMembers)
        .innerJoin(posts, eq(posts.id, teamMembers.postId))
        .where(
          and(
            eq(teamMembers.membershipId, membershipId),
            eq(posts.spaceId, spaceId),
            sql`${posts.deletedAt} is null`,
          ),
        )
        .orderBy(sql`${teamMembers.createdAt} desc`);
    },
  };
}

export type TeamsRepo = ReturnType<typeof createTeamsRepo>;
