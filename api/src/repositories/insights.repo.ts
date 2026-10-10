import { and, desc, eq, isNull, ne, sql } from 'drizzle-orm';
import { type Db, type DbOrTx, qcol } from '../db/client.js';
import { user } from '../db/schema/auth.js';
import { communities } from '../db/schema/communities.js';
import { followerCommunities, followers } from '../db/schema/followers.js';
import { inbound } from '../db/schema/inbound.js';
import { memberships } from '../db/schema/memberships.js';
import { posts } from '../db/schema/posts.js';
import { teamMembers } from '../db/schema/social.js';
import { displayName } from '../lib/present.js';
import { ideaScore } from '../lib/ranking.js';

/** Raw per-community counts over [from, to) for the activity report. */
export interface CommunityActivityCounts {
  communityId: string;
  members: number;
  newMembers: number;
  posts: number;
  comments: number;
  signals: number;
  activeMembers: number;
  followers: number;
}

/** One CSV row: column name -> cell. lib/csv.ts turns rows into text. */
export type ExportRow = Record<string, string | number | boolean | Date | null>;

/** Exports stop here (newest first); also the follower roster cap. */
export const EXPORT_ROW_CAP = 5000;

/** Read-only queries for Insights: community activity and CSV exports. */
export function createInsightsRepo(db: Db) {
  return {
    /**
     * Counts per non-archived community of the space over [from, to), one statement. Posts
     * and comments are not deleted (hidden included, owner included); active members are
     * distinct non-removed memberships that posted, commented or signalled in the window;
     * `members` and `followers` are current.
     */
    async communityActivity(
      spaceId: string,
      from: Date,
      to: Date,
      tx: DbOrTx = db,
    ): Promise<CommunityActivityCounts[]> {
      const f = sql`${from.toISOString()}::timestamptz`;
      const t = sql`${to.toISOString()}::timestamptz`;
      const rows = await tx.execute<{
        community_id: string;
        members: number;
        new_members: number;
        posts: number;
        comments: number;
        signals: number;
        active_members: number;
        followers: number;
      }>(sql`
        select c.id as community_id,
          c.member_count::int as members,
          (select count(*)::int from community_members cm
            join memberships m on m.id = cm.membership_id and m.removed_at is null
            where cm.community_id = c.id and cm.joined_at >= ${f} and cm.joined_at < ${t}) as new_members,
          (select count(*)::int from posts p
            where p.community_id = c.id and p.deleted_at is null
              and p.created_at >= ${f} and p.created_at < ${t}) as posts,
          (select count(*)::int from comments k
            join posts p on p.id = k.post_id and p.deleted_at is null
            where p.community_id = c.id and k.deleted_at is null
              and k.created_at >= ${f} and k.created_at < ${t}) as comments,
          (select count(*)::int from signals s
            join posts p on p.id = s.post_id and p.deleted_at is null
            where p.community_id = c.id and s.created_at >= ${f} and s.created_at < ${t}) as signals,
          (select count(distinct e.mid)::int from (
              select p.author_membership_id as mid from posts p
                where p.community_id = c.id and p.deleted_at is null
                  and p.created_at >= ${f} and p.created_at < ${t}
              union all
              select k.author_membership_id from comments k
                join posts p on p.id = k.post_id and p.deleted_at is null
                where p.community_id = c.id and k.deleted_at is null
                  and k.created_at >= ${f} and k.created_at < ${t}
              union all
              select s.membership_id from signals s
                join posts p on p.id = s.post_id and p.deleted_at is null
                where p.community_id = c.id and s.created_at >= ${f} and s.created_at < ${t}
            ) e
            join memberships m on m.id = e.mid and m.removed_at is null) as active_members,
          (select count(*)::int from follower_communities fc where fc.community_id = c.id) as followers
        from communities c
        where c.space_id = ${spaceId} and c.archived_at is null
      `);
      return rows.map((row) => ({
        communityId: row.community_id,
        members: row.members,
        newMembers: row.new_members,
        posts: row.posts,
        comments: row.comments,
        signals: row.signals,
        activeMembers: row.active_members,
        followers: row.followers,
      }));
    },

    /** Not-deleted posts (hidden included), newest first. `linkBase` = `<origin>/<handle>`. */
    async ideasForExport(
      spaceId: string,
      linkBase: string,
      now: Date,
      tx: DbOrTx = db,
    ): Promise<ExportRow[]> {
      const rows = await tx
        .select({
          post: posts,
          community: communities.name,
          author: user.name,
          teamSize: sql<number>`(select count(*)::int from ${teamMembers}
            where ${teamMembers.postId} = ${posts.id} and ${teamMembers.status} = 'accepted')`,
        })
        .from(posts)
        .innerJoin(communities, eq(communities.id, posts.communityId))
        .leftJoin(memberships, eq(memberships.id, posts.authorMembershipId))
        .leftJoin(user, eq(user.id, memberships.userId))
        .where(and(eq(posts.spaceId, spaceId), isNull(posts.deletedAt)))
        .orderBy(desc(posts.createdAt), desc(posts.id))
        .limit(EXPORT_ROW_CAP);
      return rows.map(({ post, community, author, teamSize }) => ({
        id: post.id,
        created_at: post.createdAt,
        type: post.type,
        status: post.status,
        title: post.title,
        community,
        author: author === null ? 'Former member' : displayName(author),
        use_count: post.useCount,
        build_count: post.buildCount,
        comment_count: post.commentCount,
        team_size: teamSize,
        fit_score: post.aiFitScore,
        ai_category: post.aiCategory,
        ai_summary: post.aiSummary,
        idea_score: Math.round(ideaScore(post, now) * 1000) / 1000,
        featured: post.featuredAt !== null,
        hidden: post.hiddenAt !== null,
        link: `${linkBase}/p/${post.id}`,
      }));
    },

    /** The whole roster, newest first, with non-archived community names. */
    async followersForExport(spaceId: string, tx: DbOrTx = db): Promise<ExportRow[]> {
      const rows = await tx
        .select({
          follower: followers,
          tagged: sql<
            string | null
          >`(select string_agg(${qcol(communities.name)}, '; ' order by ${qcol(communities.sortOrder)}, ${qcol(communities.createdAt)})
            from ${followerCommunities} join ${communities} on ${qcol(communities.id)} = ${qcol(followerCommunities.communityId)}
            where ${qcol(followerCommunities.followerId)} = ${qcol(followers.id)} and ${qcol(communities.archivedAt)} is null)`,
        })
        .from(followers)
        .where(eq(followers.spaceId, spaceId))
        .orderBy(desc(followers.createdAt), desc(followers.id))
        .limit(EXPORT_ROW_CAP);
      return rows.map(({ follower, tagged }) => ({
        id: follower.id,
        created_at: follower.createdAt,
        name: follower.name,
        handle: follower.handle,
        platform: follower.platform,
        email: follower.email,
        note: follower.note,
        source: follower.source,
        communities: tagged,
        joined: follower.membershipId !== null,
      }));
    },

    /** Pitches minus withdrawn (filtered ones included, flagged), newest first. */
    async pitchesForExport(spaceId: string, tx: DbOrTx = db): Promise<ExportRow[]> {
      const rows = await tx
        .select({ pitch: inbound, sender: user.name })
        .from(inbound)
        .innerJoin(memberships, eq(memberships.id, inbound.senderMembershipId))
        .innerJoin(user, eq(user.id, memberships.userId))
        .where(and(eq(inbound.spaceId, spaceId), ne(inbound.status, 'withdrawn')))
        .orderBy(desc(inbound.createdAt), desc(inbound.id))
        .limit(EXPORT_ROW_CAP);
      return rows.map(({ pitch, sender }) => ({
        id: pitch.id,
        created_at: pitch.createdAt,
        type: pitch.type,
        subject: pitch.subject,
        body: pitch.body,
        status: pitch.status,
        sender: displayName(sender),
        filtered: pitch.isFiltered,
        fit_score: pitch.aiFitScore,
        ai_category: pitch.aiCategory,
        ai_summary: pitch.aiSummary,
        replied_at: pitch.repliedAt,
        reply: pitch.creatorReply,
      }));
    },
  };
}

export type InsightsRepo = ReturnType<typeof createInsightsRepo>;
