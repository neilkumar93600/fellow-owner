import {
  type CommentModerationInput,
  type CreateReportInput,
  LIMITS,
  type ReportActionInput,
  type ReportItem,
  type ReportsPage,
  type ReportsQuery,
  type ReportTarget,
} from '@fellow-owners/shared';
import type { CoreDeps } from '../container.js';
import { startOfUtcDay, toIso, toIsoOrNull } from '../lib/dates.js';
import { badRequest, notFound, rateLimited } from '../lib/errors.js';
import { clampLimit, decodeTimeCursor, encodeTimeCursor, toPage } from '../lib/pagination.js';
import { displayName, excerpt } from '../lib/present.js';
import type { ReportWithReporter } from '../repositories/reports.repo.js';
import type { AccessService } from './access.service.js';
import type { NotificationsService } from './notifications.service.js';

export type ModerationServiceDeps = Pick<CoreDeps, 'db' | 'repos' | 'logger'> & {
  access: AccessService;
  notifications: NotificationsService;
};

/** F25 moderation: reports, the owner queue, comment hide, leaving a space. */
export function createModerationService(deps: ModerationServiceDeps) {
  const { db, repos, access, notifications } = deps;
  const log = deps.logger.child({ module: 'moderation' });

  async function file(
    userId: string,
    spaceId: string,
    ownerUserId: string,
    targetType: ReportTarget,
    targetId: string,
    input: CreateReportInput,
  ): Promise<void> {
    // Repeat reports are a quiet no-op, even past the daily cap.
    if (await repos.reports.existing(userId, targetType, targetId)) return;
    const filedToday = await repos.reports.countByReporterSince(userId, startOfUtcDay());
    if (filedToday >= LIMITS.reports.perUserPerDay) {
      throw rateLimited('You have sent a lot of reports today. Try again tomorrow.');
    }
    const row = await repos.reports.insert({
      spaceId,
      reporterUserId: userId,
      targetType,
      targetId,
      reason: input.reason,
      note: input.note?.trim() || null,
    });
    if (!row) return; // a concurrent duplicate
    log.info({ spaceId, reportId: row.id, targetType }, 'report filed');
    if (ownerUserId !== userId) {
      await notifications.notify({
        userId: ownerUserId,
        spaceId,
        kind: 'report_filed',
        payload: { reportId: row.id, targetType, reason: row.reason },
      });
    }
  }

  async function present(spaceId: string, rows: ReportWithReporter[]): Promise<ReportItem[]> {
    const space = await repos.spaces.findById(spaceId);
    const targets = await repos.reports.targets(rows);
    return rows.map((row) => {
      const target = targets.get(row.targetId);
      return {
        id: row.id,
        target: {
          type: row.targetType,
          id: row.targetId,
          excerpt: target ? excerpt(target.text) : 'This has been deleted.',
          href: space && target ? `/${space.handle}/p/${target.postId}` : `/${space?.handle ?? ''}`,
          authorName: target?.authorName == null ? null : displayName(target.authorName),
          hidden: target?.hidden ?? false,
        },
        reason: row.reason,
        note: row.note,
        reporterName: row.reporterUserId ? displayName(row.reporterName) : null,
        status: row.status,
        createdAt: toIso(row.createdAt),
        resolvedAt: toIsoOrNull(row.resolvedAt),
      };
    });
  }

  return {
    async reportPost(userId: string, postId: string, input: CreateReportInput): Promise<void> {
      const ctx = await access.requirePostAccess(postId, userId);
      await file(userId, ctx.space.id, ctx.space.ownerUserId, 'post', ctx.post.id, input);
    },

    async reportComment(
      userId: string,
      commentId: string,
      input: CreateReportInput,
    ): Promise<void> {
      const comment = await repos.reports.findComment(commentId);
      if (!comment || comment.deletedAt) throw notFound('Comment');
      const ctx = await access.requirePostAccess(comment.postId, userId);
      if (comment.hiddenAt) throw notFound('Comment');
      await file(userId, ctx.space.id, ctx.space.ownerUserId, 'comment', comment.id, input);
    },

    async listReports(spaceId: string, query: ReportsQuery): Promise<ReportsPage> {
      const limit = clampLimit(query.limit);
      const rows = await repos.reports.listBySpace(spaceId, {
        status: query.status,
        cursor: decodeTimeCursor(query.cursor),
        limit: limit + 1,
      });
      const page = toPage(rows, limit, encodeTimeCursor);
      return {
        items: await present(spaceId, page.items),
        nextCursor: page.nextCursor,
        openCount: await repos.reports.openCount(spaceId),
      };
    },

    async actOnReport(
      spaceId: string,
      userId: string,
      reportId: string,
      input: ReportActionInput,
    ): Promise<ReportItem> {
      const report = await repos.reports.findInSpace(spaceId, reportId);
      if (!report) throw notFound('Report');
      await db.transaction(async (tx) => {
        if (input.action === 'hide_target') {
          if (report.targetType === 'post') {
            await repos.posts.setHidden(spaceId, report.targetId, true, tx);
          } else {
            await repos.comments.setHidden(spaceId, report.targetId, true, tx);
          }
          await repos.reports.resolveOpenForTarget(
            spaceId,
            report.targetType,
            report.targetId,
            userId,
            tx,
          );
        }
        if (input.action !== 'hide_target' && report.status === 'open') {
          await repos.reports.close(
            report.id,
            input.action === 'resolve' ? 'resolved' : 'dismissed',
            userId,
            tx,
          );
        }
      });
      const fresh = await repos.reports.findInSpace(spaceId, reportId);
      const [item] = await present(spaceId, fresh ? [fresh] : []);
      if (!item) throw notFound('Report');
      return item;
    },

    async moderateComment(
      spaceId: string,
      postId: string,
      commentId: string,
      input: CommentModerationInput,
    ): Promise<void> {
      const comment = await repos.comments.findById(postId, commentId);
      if (!comment || comment.spaceId !== spaceId || comment.deletedAt) {
        throw notFound('Comment');
      }
      await repos.comments.setHidden(spaceId, commentId, input.action === 'hide');
    },

    /** DELETE /api/spaces/:handle/me; the owner cannot leave their own space (400). */
    async leave(handle: string, userId: string): Promise<void> {
      const space = await access.spaceByHandle(handle);
      if (space.ownerUserId === userId) throw badRequest("You can't leave your own space");
      const ctx = await access.requireMember(space, userId);
      await repos.memberships.remove(space.id, ctx.membership.id, undefined, { left: true });
      log.info({ spaceId: space.id, membershipId: ctx.membership.id }, 'member left');
    },
  };
}

export type ModerationService = ReturnType<typeof createModerationService>;
