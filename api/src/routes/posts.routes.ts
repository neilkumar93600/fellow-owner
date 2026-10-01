import {
  commentParamsSchema,
  createCommentSchema,
  idParamsSchema,
  signalParamsSchema,
  teamDecisionSchema,
  teamParamsSchema,
  teamRequestSchema,
  updatePostSchema,
} from '@fellow-owners/shared';
import { Router } from 'express';
import type { Container } from '../container.js';
import { noStore } from '../lib/http.js';
import { requireSession } from '../middlewares/require-session.js';
import { validate } from '../middlewares/validate.js';

/**
 * /api/posts/:id/*: post detail and edits, comments, signals, team requests and decisions.
 * Every route needs a session; membership of the post's space is checked in the services.
 */
export function createPostsRoutes(container: Container): Router {
  const router = Router();
  const controller = container.controllers.posts;
  const session = requireSession(container.auth);
  const byId = validate({ params: idParamsSchema });

  router.use(noStore());

  router.get('/:id', session, byId, controller.detail);
  router.patch(
    '/:id',
    session,
    validate({ params: idParamsSchema, body: updatePostSchema }),
    controller.update,
  );
  router.delete('/:id', session, byId, controller.remove);

  router.post(
    '/:id/comments',
    session,
    validate({ params: idParamsSchema, body: createCommentSchema }),
    controller.createComment,
  );
  router.delete(
    '/:id/comments/:commentId',
    session,
    validate({ params: commentParamsSchema }),
    controller.deleteComment,
  );

  router.put(
    '/:id/signals/:kind',
    session,
    validate({ params: signalParamsSchema }),
    controller.addSignal,
  );
  router.delete(
    '/:id/signals/:kind',
    session,
    validate({ params: signalParamsSchema }),
    controller.removeSignal,
  );

  router.post(
    '/:id/team',
    session,
    validate({ params: idParamsSchema, body: teamRequestSchema }),
    controller.requestTeam,
  );
  router.patch(
    '/:id/team/:membershipId',
    session,
    validate({ params: teamParamsSchema, body: teamDecisionSchema }),
    controller.decideTeam,
  );
  return router;
}
