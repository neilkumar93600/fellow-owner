import type { ReportStatus, ReportTarget } from '@fellow-owners/shared';
import { and, count, desc, eq, getTableColumns, gte, inArray, lt, or } from 'drizzle-orm';
import type { Db, DbOrTx } from '../db/client.js';
import { user } from '../db/schema/auth.js';
import { memberships } from '../db/schema/memberships.js';
import { reports } from '../db/schema/moderation.js';
import { posts } from '../db/schema/posts.js';
import { comments } from '../db/schema/social.js';
import type { TimeCursor } from '../lib/pagination.js';

export interface NewReport {
  spaceId: string;
  reporterUserId: string;
  targetType: ReportTarget;
  targetId: string;
  reason: (typeof reports.$inferInsert)['reason'];
  note: string | null;
}

/** A report with the reporter's name (null once their account is gone). */
export type ReportWithReporter = typeof reports.$inferSelect & { reporterName: string | null };

/** What a report points at, for the owner's queue. */
export interface ReportTargetInfo {
  id: string;
  /** The post that holds it (the post itself for a post target). */
  postId: string;
  text: string;
  hidden: boolean;
  /** Null for a "Former member". */
  authorName: string | null;
}

/** reports (F25 moderation queue). */
export function createReportsRepo(db: Db) {
  const withReporter = { ...getTableColumns(reports), reporterName: user.name };

  return {
    /** Inserts the report; null when this reporter already reported this target. */
    async insert(values: NewReport, tx: DbOrTx = db): Promise<typeof reports.$inferSelect | null> {
      const [row] = await tx
        .insert(reports)
        .values(values)
        .onConflictDoNothing({
          target: [reports.reporterUserId, reports.targetType, reports.targetId],
        })
        .returning();
      return row ?? null;
    },

    /** Reports the user filed since `since` (daily cap). */
    async countByReporterSince(userId: string, since: Date, tx: DbOrTx = db): Promise<number> {
      const [row] = await tx
        .select({ n: count() })
        .from(reports)
        .where(and(eq(reports.reporterUserId, userId), gte(reports.createdAt, since)));
      return row?.n ?? 0;
    },

    async existing(
      userId: string,
      targetType: ReportTarget,
      targetId: string,
      tx: DbOrTx = db,
    ): Promise<boolean> {
      const [row] = await tx
        .select({ id: reports.id })
        .from(reports)
        .where(
          and(
            eq(reports.reporterUserId, userId),
            eq(reports.targetType, targetType),
            eq(reports.targetId, targetId),
          ),
        )
        .limit(1);
      return Boolean(row);
    },

    async findInSpace(
      spaceId: string,
      id: string,
      tx: DbOrTx = db,
    ): Promise<ReportWithReporter | null> {
      const [row] = await tx
        .select(withReporter)
        .from(reports)
        .leftJoin(user, eq(user.id, reports.reporterUserId))
        .where(and(eq(reports.spaceId, spaceId), eq(reports.id, id)))
        .limit(1);
      return row ?? null;
    },

    /** Newest first; `limit` rows (callers ask for one extra to detect another page). */
    async listBySpace(
      spaceId: string,
      {
        status,
        cursor,
        limit,
      }: { status?: ReportStatus | undefined; cursor: TimeCursor | null; limit: number },
      tx: DbOrTx = db,
    ): Promise<ReportWithReporter[]> {
      return tx
        .select(withReporter)
        .from(reports)
        .leftJoin(user, eq(user.id, reports.reporterUserId))
        .where(
          and(
            eq(reports.spaceId, spaceId),
            status ? eq(reports.status, status) : undefined,
            cursor
              ? or(
                  lt(reports.createdAt, cursor.createdAt),
                  and(eq(reports.createdAt, cursor.createdAt), lt(reports.id, cursor.id)),
                )
              : undefined,
          ),
        )
        .orderBy(desc(reports.createdAt), desc(reports.id))
        .limit(limit);
    },

    async openCount(spaceId: string, tx: DbOrTx = db): Promise<number> {
      const [row] = await tx
        .select({ n: count() })
        .from(reports)
        .where(and(eq(reports.spaceId, spaceId), eq(reports.status, 'open')));
      return row?.n ?? 0;
    },

    /** Closes one report. */
    async close(
      id: string,
      status: Exclude<ReportStatus, 'open'>,
      byUserId: string,
      tx: DbOrTx = db,
    ): Promise<void> {
      await tx
        .update(reports)
        .set({ status, resolvedByUserId: byUserId, resolvedAt: new Date() })
        .where(eq(reports.id, id));
    },

    /** Resolves every open report on one target (the owner hid it). */
    async resolveOpenForTarget(
      spaceId: string,
      targetType: ReportTarget,
      targetId: string,
      byUserId: string,
      tx: DbOrTx = db,
    ): Promise<void> {
      await tx
        .update(reports)
        .set({ status: 'resolved', resolvedByUserId: byUserId, resolvedAt: new Date() })
        .where(
          and(
            eq(reports.spaceId, spaceId),
            eq(reports.targetType, targetType),
            eq(reports.targetId, targetId),
            eq(reports.status, 'open'),
          ),
        );
    },

    /** A comment by id alone (report routes know only the comment id). */
    async findComment(commentId: string, tx: DbOrTx = db) {
      const [row] = await tx.select().from(comments).where(eq(comments.id, commentId)).limit(1);
      return row ?? null;
    },

    /** Post and comment targets of a page of reports, keyed by target id. */
    async targets(
      rows: { targetType: ReportTarget; targetId: string }[],
      tx: DbOrTx = db,
    ): Promise<Map<string, ReportTargetInfo>> {
      const out = new Map<string, ReportTargetInfo>();
      const postIds = rows.filter((r) => r.targetType === 'post').map((r) => r.targetId);
      const commentIds = rows.filter((r) => r.targetType === 'comment').map((r) => r.targetId);
      if (postIds.length > 0) {
        const found = await tx
          .select({
            id: posts.id,
            title: posts.title,
            hiddenAt: posts.hiddenAt,
            authorMembershipId: posts.authorMembershipId,
            authorName: user.name,
          })
          .from(posts)
          .leftJoin(memberships, eq(memberships.id, posts.authorMembershipId))
          .leftJoin(user, eq(user.id, memberships.userId))
          .where(inArray(posts.id, postIds));
        for (const r of found) {
          out.set(r.id, {
            id: r.id,
            postId: r.id,
            text: r.title,
            hidden: r.hiddenAt !== null,
            authorName: r.authorMembershipId ? (r.authorName ?? '') : null,
          });
        }
      }
      if (commentIds.length > 0) {
        const found = await tx
          .select({
            id: comments.id,
            postId: comments.postId,
            body: comments.body,
            hiddenAt: comments.hiddenAt,
            authorMembershipId: comments.authorMembershipId,
            authorName: user.name,
          })
          .from(comments)
          .leftJoin(memberships, eq(memberships.id, comments.authorMembershipId))
          .leftJoin(user, eq(user.id, memberships.userId))
          .where(inArray(comments.id, commentIds));
        for (const r of found) {
          out.set(r.id, {
            id: r.id,
            postId: r.postId,
            text: r.body,
            hidden: r.hiddenAt !== null,
            authorName: r.authorMembershipId ? (r.authorName ?? '') : null,
          });
        }
      }
      return out;
    },
  };
}

export type ReportsRepo = ReturnType<typeof createReportsRepo>;
