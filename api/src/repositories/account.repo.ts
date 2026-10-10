import { and, asc, eq, inArray, isNotNull, sql } from 'drizzle-orm';
import { type Db, type DbOrTx, qcol } from '../db/client.js';
import { user } from '../db/schema/auth.js';
import { inbound } from '../db/schema/inbound.js';
import { notifications } from '../db/schema/later.js';
import { memberships } from '../db/schema/memberships.js';
import { posts } from '../db/schema/posts.js';
import { questionGroups } from '../db/schema/question-groups.js';
import { comments, signals } from '../db/schema/social.js';
import { spaces } from '../db/schema/spaces.js';

/** Cross-table reads and writes for account export (GET /api/me/export) and deletion. */
export function createAccountRepo(db: Db) {
  return {
    /**
     * Everything the export holds, read with explicit columns: the caller's own rows only, never
     * embeddings, AI triage of their pitches, or other people's rows in a space they own.
     */
    async exportRows(userId: string, tx: DbOrTx = db) {
      const [me] = await tx
        .select({
          id: user.id,
          name: user.name,
          email: user.email,
          username: user.username,
          createdAt: user.createdAt,
          socialPlatform: user.socialPlatform,
          socialHandle: user.socialHandle,
        })
        .from(user)
        .where(eq(user.id, userId))
        .limit(1);
      if (!me) return null;

      const ownedSpaces = await tx
        .select({
          id: spaces.id,
          handle: spaces.handle,
          displayName: spaces.displayName,
          bio: spaces.bio,
          avatarUrl: spaces.avatarUrl,
          coverUrl: spaces.coverUrl,
          platforms: spaces.platforms,
          tasteProfile: spaces.tasteProfile,
          showReadReceipts: spaces.showReadReceipts,
          createdAt: spaces.createdAt,
        })
        .from(spaces)
        .where(eq(spaces.ownerUserId, userId));

      const mine = await tx
        .select({
          id: memberships.id,
          space: spaces.handle,
          role: memberships.role,
          headline: memberships.headline,
          intro: memberships.intro,
          skills: memberships.skills,
          links: memberships.links,
          spotlightNote: memberships.spotlightNote,
          joinedAt: memberships.joinedAt,
          removedAt: memberships.removedAt,
        })
        .from(memberships)
        .innerJoin(spaces, eq(spaces.id, memberships.spaceId))
        .where(eq(memberships.userId, userId))
        .orderBy(asc(memberships.joinedAt));
      const ids = mine.map((m) => m.id);

      const myPosts = ids.length
        ? await tx
            .select({
              id: posts.id,
              spaceId: posts.spaceId,
              type: posts.type,
              title: posts.title,
              body: posts.body,
              status: posts.status,
              rolesNeeded: posts.rolesNeeded,
              links: posts.links,
              createdAt: posts.createdAt,
              deletedAt: posts.deletedAt,
            })
            .from(posts)
            .where(inArray(posts.authorMembershipId, ids))
            .orderBy(asc(posts.createdAt))
        : [];
      const myComments = ids.length
        ? await tx
            .select({
              id: comments.id,
              postId: comments.postId,
              body: comments.body,
              createdAt: comments.createdAt,
              deletedAt: comments.deletedAt,
            })
            .from(comments)
            .where(inArray(comments.authorMembershipId, ids))
            .orderBy(asc(comments.createdAt))
        : [];
      const myPitches = ids.length
        ? await tx
            .select({
              id: inbound.id,
              spaceId: inbound.spaceId,
              type: inbound.type,
              subject: inbound.subject,
              body: inbound.body,
              links: inbound.links,
              status: inbound.status,
              creatorReply: inbound.creatorReply,
              repliedAt: inbound.repliedAt,
              createdAt: inbound.createdAt,
            })
            .from(inbound)
            .where(inArray(inbound.senderMembershipId, ids))
            .orderBy(asc(inbound.createdAt))
        : [];
      const myNotifications = await tx
        .select({
          id: notifications.id,
          kind: notifications.kind,
          payload: notifications.payload,
          readAt: notifications.readAt,
          createdAt: notifications.createdAt,
        })
        .from(notifications)
        .where(eq(notifications.userId, userId))
        .orderBy(asc(notifications.createdAt));

      return {
        user: me,
        ownedSpaces,
        memberships: mine,
        posts: myPosts,
        comments: myComments,
        pitches: myPitches,
        notifications: myNotifications,
      };
    },

    /** Deletes the spaces the user owns (everything in them cascades); returns their ids. */
    async deleteOwnedSpaces(userId: string, tx: DbOrTx = db): Promise<string[]> {
      const rows = await tx
        .delete(spaces)
        .where(eq(spaces.ownerUserId, userId))
        .returning({ id: spaces.id });
      return rows.map((row) => row.id);
    },

    /** The user's memberships (removed ones included). */
    async membershipsOf(userId: string, tx: DbOrTx = db) {
      return tx
        .select({
          id: memberships.id,
          spaceId: memberships.spaceId,
          removedAt: memberships.removedAt,
        })
        .from(memberships)
        .where(eq(memberships.userId, userId));
    },

    /**
     * Deletes every membership of the user. Their posts and comments stay with a null author
     * ("Former member"); signals, team seats and pitches cascade. Afterwards the counters those
     * cascades touched are recomputed: use/build/comment counts on posts they signalled or
     * commented on, and asked_count on question groups that held one of their pitches.
     * Call community-leaving (memberships.remove) first so member_count stays right.
     */
    async deleteMemberships(userId: string, tx: DbOrTx = db): Promise<void> {
      const mine = tx
        .select({ id: memberships.id })
        .from(memberships)
        .where(eq(memberships.userId, userId));
      const signalled = await tx
        .selectDistinct({ id: signals.postId })
        .from(signals)
        .where(inArray(signals.membershipId, mine));
      const commented = await tx
        .selectDistinct({ id: comments.postId })
        .from(comments)
        .where(inArray(comments.authorMembershipId, mine));
      const grouped = await tx
        .selectDistinct({ id: inbound.questionGroupId })
        .from(inbound)
        .where(and(inArray(inbound.senderMembershipId, mine), isNotNull(inbound.questionGroupId)));

      await tx.delete(memberships).where(eq(memberships.userId, userId));

      const postIds = [...new Set([...signalled, ...commented].map((r) => r.id))];
      if (postIds.length) {
        await tx
          .update(posts)
          .set({
            useCount: sql`(select count(*)::int from signals s where s.post_id = ${qcol(posts.id)} and s.kind = 'use')`,
            buildCount: sql`(select count(*)::int from signals s where s.post_id = ${qcol(posts.id)} and s.kind = 'build')`,
            commentCount: sql`(select count(*)::int from comments c where c.post_id = ${qcol(posts.id)} and c.deleted_at is null)`,
          })
          .where(inArray(posts.id, postIds));
      }
      const groupIds = grouped.flatMap((r) => (r.id ? [r.id] : []));
      if (groupIds.length) {
        await tx
          .update(questionGroups)
          .set({
            askedCount: sql`(select count(*)::int from inbound i where i.question_group_id = ${qcol(questionGroups.id)})`,
          })
          .where(inArray(questionGroups.id, groupIds));
      }
    },
  };
}

export type AccountRepo = ReturnType<typeof createAccountRepo>;
