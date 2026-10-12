import { and, asc, count, desc, eq, gte, isNotNull, isNull, lt, sql } from 'drizzle-orm';
import { chunk, type Db, type DbOrTx, inTransaction } from '../db/client.js';
import { user } from '../db/schema/auth.js';
import { memberships } from '../db/schema/memberships.js';
import { posts } from '../db/schema/posts.js';
import { type CommentRow, comments, type NewCommentRow } from '../db/schema/social.js';
import { type PageResult, toPage } from '../lib/pagination.js';

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

function threadQuery(tx: DbOrTx) {
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
    .leftJoin(user, eq(user.id, memberships.userId));
}

/** posts.comment_count += delta (never below 0): visible, not-deleted comments only. */
async function changeCount(postId: string, delta: number, tx: DbOrTx): Promise<void> {
  await tx
    .update(posts)
    .set({ commentCount: sql`greatest(0, ${posts.commentCount} + ${delta})` })
    .where(eq(posts.id, postId));
}

export function createCommentsRepo(db: Db) {
  return {
    /** Inserts the comment and increments posts.comment_count in one transaction. */
    async create(values: NewComment, tx?: DbOrTx): Promise<CommentRow> {
      return inTransaction(db, tx, async (t) => {
        const [row] = await t.insert(comments).values(values).returning();
        if (!row) throw new Error('insert into comments returned no row');
        await changeCount(values.postId, 1, t);
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

    /**
     * Author soft delete, atomically with comment_count - 1 (only for a visible comment: hidden
     * ones are already out of the count). False when missing or already deleted.
     */
    async softDelete(postId: string, commentId: string, tx?: DbOrTx): Promise<boolean> {
      return inTransaction(db, tx, async (t) => {
        const [row] = await t
          .update(comments)
          .set({ deletedAt: new Date() })
          .where(
            and(
              eq(comments.postId, postId),
              eq(comments.id, commentId),
              isNull(comments.deletedAt),
            ),
          )
          .returning({ hiddenAt: comments.hiddenAt });
        if (!row) return false;
        if (row.hiddenAt === null) await changeCount(postId, -1, t);
        return true;
      });
    },

    /**
     * Owner moderation (05 §6: owner hides comments). posts.comment_count counts what members see,
     * so it moves by one when a live comment actually changes state. Null when not in the space.
     */
    async setHidden(
      spaceId: string,
      commentId: string,
      hidden: boolean,
      tx?: DbOrTx,
    ): Promise<CommentRow | null> {
      return inTransaction(db, tx, async (t) => {
        const where = and(eq(comments.spaceId, spaceId), eq(comments.id, commentId));
        const [changed] = await t
          .update(comments)
          .set({ hiddenAt: hidden ? new Date() : null })
          .where(and(where, hidden ? isNull(comments.hiddenAt) : isNotNull(comments.hiddenAt)))
          .returning();
        if (changed) {
          if (changed.deletedAt === null) await changeCount(changed.postId, hidden ? -1 : 1, t);
          return changed;
        }
        const [current] = await t.select().from(comments).where(where).limit(1);
        return current ?? null;
      });
    },

    /**
     * One page of a post's thread for members (not deleted or hidden): the newest `limit`
     * comments older than the comment `before` (all when absent), returned oldest first.
     * `nextCursor` is the id of the oldest comment on the page when older ones exist.
     */
    async listPage(
      postId: string,
      { before, limit }: { before?: string | undefined; limit: number },
      tx: DbOrTx = db,
    ): Promise<PageResult<CommentWithAuthor>> {
      const rows = await threadQuery(tx)
        .where(
          and(
            eq(comments.postId, postId),
            isNull(comments.deletedAt),
            isNull(comments.hiddenAt),
            before
              ? sql`(${comments.createdAt}, ${comments.id}) < (select c.created_at, c.id from comments c where c.id = ${before}::uuid and c.post_id = ${postId}::uuid)`
              : undefined,
          ),
        )
        .orderBy(desc(comments.createdAt), desc(comments.id))
        .limit(limit + 1);
      const page = toPage(rows, limit, (oldest) => oldest.id);
      return { items: page.items.reverse(), nextCursor: page.nextCursor };
    },

    /** Thread for a post, oldest first, not deleted (hidden ones only with includeHidden). */
    async listByPost(
      postId: string,
      { includeHidden = false, limit = 500 }: { includeHidden?: boolean; limit?: number } = {},
      tx: DbOrTx = db,
    ): Promise<CommentWithAuthor[]> {
      return threadQuery(tx)
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
