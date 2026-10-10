import {
  commentIdParamsSchema,
  commentModerationSchema,
  createReportSchema,
  handleParamsSchema,
  idParamsSchema,
  postCommentParamsSchema,
  postIdParamsSchema,
  reportActionSchema,
  reportsQuerySchema,
} from '@fellow-owners/shared';
import { Router } from 'express';
import type { Container } from '../container.js';
import { noStore } from '../lib/http.js';
import { requireOwner } from '../middlewares/require-owner.js';
import { requireSession } from '../middlewares/require-session.js';
import { validate } from '../middlewares/validate.js';

// These routers share their mount prefixes with others (/api/spaces, /api, /api/studio), so they
// use per-route middleware only: a router.use() here would run for every request on the prefix.

/** DELETE /api/spaces/:handle/me (session): leave the space. */
export function createModerationMemberRoutes(container: Container): Router {
  const router = Router();
  router.delete(
    '/:handle/me',
    noStore(),
    requireSession(container.auth),
    validate({ params: handleParamsSchema }),
    container.controllers.moderation.leave,
  );
  return router;
}

/** POST /api/posts/:postId/report and POST /api/comments/:commentId/report (session). */
export function createModerationTargetRoutes(container: Container): Router {
  const router = Router();
  const controller = container.controllers.moderation;
  const session = requireSession(container.auth);
  router.post(
    '/posts/:postId/report',
    noStore(),
    session,
    validate({ params: postIdParamsSchema, body: createReportSchema }),
    controller.reportPost,
  );
  router.post(
    '/comments/:commentId/report',
    noStore(),
    session,
    validate({ params: commentIdParamsSchema, body: createReportSchema }),
    controller.reportComment,
  );
  return router;
}

/** /api/studio/reports and PATCH /api/studio/posts/:postId/comments/:commentId (owner). */
export function createModerationStudioRoutes(container: Container): Router {
  const router = Router();
  const { auth, repos } = container;
  const controller = container.controllers.moderation;
  const owner = requireOwner({ auth, spaces: repos.spaces, memberships: repos.memberships });
  router.get(
    '/reports',
    noStore(),
    owner,
    validate({ query: reportsQuerySchema }),
    controller.listReports,
  );
  router.patch(
    '/reports/:id',
    noStore(),
    owner,
    validate({ params: idParamsSchema, body: reportActionSchema }),
    controller.actOnReport,
  );
  router.patch(
    '/posts/:postId/comments/:commentId',
    noStore(),
    owner,
    validate({ params: postCommentParamsSchema, body: commentModerationSchema }),
    controller.moderateComment,
  );
  return router;
}
