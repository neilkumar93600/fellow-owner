import { and, asc, count, eq, gte, isNotNull, isNull, lt, sql } from 'drizzle-orm';
import { chunk, type Db, type DbOrTx, inTransaction } from '../db/client.js';
import { user } from '../db/schema/auth.js';
import { memberships } from '../db/schema/memberships.js';
import { posts } from '../db/schema/posts.js';
import { type CommentRow, comments, type NewCommentRow } from '../db/schema/social.js';

/** A comment with its author's MemberRef fields (null author = "Former member"). */
export interface CommentWithAuthor extends CommentRow {
  authorName: string | null;
  authorHeadline: string | null;
  authorImage: string | null;
}

export interface NewComment {
  postId: string;
  spaceId: string;
  authorMembershipId: string;
  body: string;
}

export function createCommentsRepo(db: Db) {
  return {
    /** Inserts the comment and increments posts.comment_count in one transaction. */
    async create(values: NewComment, tx?: DbOrTx): Promise<CommentRow> {
      return inTransaction(db, tx, async (t) => {
        const [row] = await t.insert(comments).values(values).returning();
        if (!row) throw new Error('insert into comments returned no row');
        await t
          .update(posts)
          .set({ commentCount: sql`${posts.commentCount} + 1` })
          .where(eq(posts.id, values.postId));
        return row;
      });
    },

    /** Seed only: no counter updates (follow with posts.recountCounters). */
    async insertMany(values: NewCommentRow[], tx: DbOrTx = db): Promise<void> {
      for (const part of chunk(values)) await tx.insert(comments).values(part);
    },

    async findById(postId: string, commentId: string, tx: DbOrTx = db): Promise<CommentRow | null> {
      const [row] = await tx
        .select()
        .from(comments)
        .where(and(eq(comments.postId, postId), eq(comments.id, commentId)))
        .limit(1);
      return row ?? null;
    },

    /** Author soft delete + comment_count - 1, atomically. False when missing or already deleted. */
    async softDelete(postId: string, commentId: string, tx?: DbOrTx): Promise<boolean> {
      return inTransaction(db, tx, async (t) => {
        const rows = await t
          .update(comments)
          .set({ deletedAt: new Date() })
          .where(
            and(
              eq(comments.postId, postId),
              eq(comments.id, commentId),
              isNull(comments.deletedAt),
            ),
          )
          .returning({ id: comments.id });
        if (rows.length === 0) return false;
        await t
          .update(posts)
          .set({ commentCount: sql`greatest(0, ${posts.commentCount} - 1)` })
          .where(eq(posts.id, postId));
        return true;
      });
    },

    /** Owner moderation (05 §6: owner hides comments). */
    async setHidden(
      spaceId: string,
      commentId: string,
      hidden: boolean,
      tx: DbOrTx = db,
    ): Promise<CommentRow | null> {
      const [row] = await tx
        .update(comments)
        .set({ hiddenAt: hidden ? new Date() : null })
        .where(and(eq(comments.spaceId, spaceId), eq(comments.id, commentId)))
        .returning();
      return row ?? null;
    },

    /** Thread for a post, oldest first, not deleted (hidden ones only with includeHidden). */
    async listByPost(
      postId: string,
      { includeHidden = false, limit = 500 }: { includeHidden?: boolean; limit?: number } = {},
      tx: DbOrTx = db,
    ): Promise<CommentWithAuthor[]> {
      return tx
        .select({
          id: comments.id,
          postId: comments.postId,
          spaceId: comments.spaceId,
          authorMembershipId: comments.authorMembershipId,
          body: comments.body,
          hiddenAt: comments.hiddenAt,
          deletedAt: comments.deletedAt,
          createdAt: comments.createdAt,
          authorName: user.name,
          authorHeadline: memberships.headline,
          authorImage: user.image,
        })
        .from(comments)
        .leftJoin(memberships, eq(memberships.id, comments.authorMembershipId))
        .leftJoin(user, eq(user.id, memberships.userId))
        .where(
          and(
            eq(comments.postId, postId),
            isNull(comments.deletedAt),
            includeHidden ? undefined : isNull(comments.hiddenAt),
          ),
        )
        .orderBy(asc(comments.createdAt), asc(comments.id))
        .limit(limit);
    },

    /** Daily cap: comments by the member in the space since `since` (deleted ones count too). */
    async countByAuthorSince(
      spaceId: string,
      membershipId: string,
      since: Date,
      tx: DbOrTx = db,
    ): Promise<number> {
      const [row] = await tx
        .select({ n: count() })
        .from(comments)
        .where(
          and(
            eq(comments.spaceId, spaceId),
            eq(comments.authorMembershipId, membershipId),
            gte(comments.createdAt, since),
          ),
        );
      return row?.n ?? 0;
    },

    /** Hard-deletes comments soft-deleted before `before` (05 §8: 30 days). */
    async purgeSoftDeleted(before: Date, tx: DbOrTx = db): Promise<number> {
      const rows = await tx
        .delete(comments)
        .where(and(isNotNull(comments.deletedAt), lt(comments.deletedAt, before)))
        .returning({ id: comments.id });
      return rows.length;
    },
  };
}

export type CommentsRepo = ReturnType<typeof createCommentsRepo>;
