import {
  backProjectSchema,
  COLLAB_LIMITS,
  createPollSchema,
  createProjectUpdateSchema,
  handlePostParamsSchema,
  idParamsSchema,
  pollVoteSchema,
  projectUpdateParamsSchema,
  projectUpdatesQuerySchema,
} from '@fellow-owners/shared';
import { Router } from 'express';
import type { Container } from '../container.js';
import { noStore } from '../lib/http.js';
import { createRateLimit } from '../middlewares/rate-limit.js';
import { requireSpaceOwner } from '../middlewares/require-owner.js';
import { requireSession, userIdOf } from '../middlewares/require-session.js';
import { validate } from '../middlewares/validate.js';

/**
 * F4 member routes on /api/posts/:id (session; membership of the post's space is checked in the
 * service, as for posts.routes):
 *   GET    /:id/poll                    -> Poll
 *   POST   /:id/poll                    -> Poll (201, post author)
 *   PUT    /:id/poll/vote   {optionIds} -> Poll
 *   POST   /:id/poll/close              -> Poll (post author or owner)
 *   GET    /:id/updates  ?before&limit  -> ProjectUpdatesPage
 *   POST   /:id/updates     {body}      -> ProjectUpdate (201, author or accepted team)
 *   DELETE /:id/updates/:updateId       -> 204
 *   PUT    /:id/feedback-wanted         -> FeedbackWantedState (project author)
 *   DELETE /:id/feedback-wanted         -> FeedbackWantedState
 *   PUT    /:id/follow                  -> FollowState
 *   DELETE /:id/follow                  -> FollowState
 * Mounted on /api/posts before posts.routes: per-route middleware only.
 */
export function createCollabRoutes(container: Container): Router {
  const router = Router();
  const controller = container.controllers.collab;
  const signedIn = [noStore(), requireSession(container.auth)];
  const byId = validate({ params: idParamsSchema });
  const votes = createRateLimit({
    name: 'poll-vote',
    windowSeconds: 60,
    max: COLLAB_LIMITS.votesPerMinute,
    key: (req) => userIdOf(req),
  });

  router.get('/:id/poll', signedIn, byId, controller.getPoll);
  router.post(
    '/:id/poll',
    signedIn,
    validate({ params: idParamsSchema, body: createPollSchema }),
    controller.createPoll,
  );
  router.put(
    '/:id/poll/vote',
    signedIn,
    votes,
    validate({ params: idParamsSchema, body: pollVoteSchema }),
    controller.vote,
  );
  router.post('/:id/poll/close', signedIn, byId, controller.closePoll);

  router.get(
    '/:id/updates',
    signedIn,
    validate({ params: idParamsSchema, query: projectUpdatesQuerySchema }),
    controller.listUpdates,
  );
  router.post(
    '/:id/updates',
    signedIn,
    validate({ params: idParamsSchema, body: createProjectUpdateSchema }),
    controller.createUpdate,
  );
  router.delete(
    '/:id/updates/:updateId',
    signedIn,
    validate({ params: projectUpdateParamsSchema }),
    controller.deleteUpdate,
  );

  router.put('/:id/feedback-wanted', signedIn, byId, controller.wantFeedback);
  router.delete('/:id/feedback-wanted', signedIn, byId, controller.stopFeedback);
  router.put('/:id/follow', signedIn, byId, controller.follow);
  router.delete('/:id/follow', signedIn, byId, controller.unfollow);
  return router;
}

/**
 * F4 owner route: PUT/DELETE /api/spaces/:handle/posts/:postId/back ("Back this project", badge +
 * optional note). Mounted on /api/spaces before spaces.routes: per-route middleware only.
 */
export function createBackingRoutes(container: Container): Router {
  const router = Router();
  const { auth, repos } = container;
  const controller = container.controllers.collab;
  const owner = requireSpaceOwner({ auth, spaces: repos.spaces, memberships: repos.memberships });

  router.put(
    '/:handle/posts/:postId/back',
    noStore(),
    owner,
    validate({ params: handlePostParamsSchema, body: backProjectSchema }),
    controller.back,
  );
  router.delete(
    '/:handle/posts/:postId/back',
    noStore(),
    owner,
    validate({ params: handlePostParamsSchema }),
    controller.unback,
  );
  return router;
}
