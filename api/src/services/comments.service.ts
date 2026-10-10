import type { CommentItem } from '@fellow-owners/shared';
import type { Db } from '../db/client.js';
import { toIso } from '../lib/dates.js';
import { forbidden, notFound } from '../lib/errors.js';
import type { Logger } from '../lib/logger.js';
import { displayName, memberRef } from '../lib/present.js';
import type { Repos } from '../repositories/index.js';
import type { AccessService } from './access.service.js';
import type { LimitsService } from './limits.service.js';
import type { NotificationsService } from './notifications.service.js';

export interface CommentsServiceDeps {
  db: Db;
  repos: Repos;
  access: AccessService;
  limits: LimitsService;
  /** In-app notifications (notify after commit). */
  notifications: NotificationsService;
  logger: Logger;
}

/**
 * Comments on posts (05 §6): any member may comment on a visible post (100 a day per space);
 * authors soft-delete their own. posts.comment_count moves in the same transaction.
 */
export function createCommentsService(deps: CommentsServiceDeps) {
  const { db, repos, access, limits } = deps;
  const log = deps.logger.child({ module: 'comments' });

  return {
    /** POST /api/posts/:id/comments */
    async create(postId: string, userId: string, body: string): Promise<CommentItem> {
      const ctx = await access.requirePostAccess(postId, userId);
      const comment = await db.transaction(async (tx) => {
        await limits.lockWrites(ctx.space.id, userId, tx);
        await limits.assertDailyCap('comments', ctx.space, ctx.membership.id, tx);
        return repos.comments.create(
          {
            postId: ctx.post.id,
            spaceId: ctx.space.id,
            authorMembershipId: ctx.membership.id,
            body,
          },
          tx,
        );
      });
      const refs = await repos.memberships.refs([ctx.membership.id]);
      log.debug({ postId, commentId: comment.id }, 'comment created');
      const author = await deps.notifications.member(ctx.post.authorMembershipId);
      if (author.userId && author.userId !== userId) {
        await deps.notifications.notify({
          userId: author.userId,
          spaceId: ctx.space.id,
          kind: 'comment_received',
          payload: {
            postId: ctx.post.id,
            title: ctx.post.title,
            actorName: displayName(refs.get(ctx.membership.id)?.name),
            commentId: comment.id,
          },
        });
      }
      return {
        id: comment.id,
        body: comment.body,
        author: memberRef(refs.get(ctx.membership.id)),
        createdAt: toIso(comment.createdAt),
        isOwn: true,
      };
    },

    /** DELETE /api/posts/:id/comments/:commentId (comment author): soft delete, count - 1. */
    async remove(postId: string, commentId: string, userId: string): Promise<void> {
      const ctx = await access.requirePostAccess(postId, userId, { allowHidden: true });
      const comment = await repos.comments.findById(ctx.post.id, commentId);
      if (!comment || comment.deletedAt) throw notFound('Comment');
      if (comment.authorMembershipId !== ctx.membership.id) {
        throw forbidden('Only the author can delete this comment');
      }
      await repos.comments.softDelete(ctx.post.id, comment.id);
    },
  };
}

export type CommentsService = ReturnType<typeof createCommentsService>;
