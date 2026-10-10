import { postIdParamsSchema } from '@fellow-owners/shared';
import { Router } from 'express';
import type { Container } from '../container.js';
import { noStore } from '../lib/http.js';
import { requireOwner } from '../middlewares/require-owner.js';
import { requireSession } from '../middlewares/require-session.js';
import { validate } from '../middlewares/validate.js';

/**
 * Mounted on /api (before posts.routes and studio.routes), so no router.use here:
 *   GET /api/posts/:postId/similar         (session; the service checks membership)
 *   GET /api/studio/posts/:postId/similar  (owner)
 */
export function createSimilarRoutes(container: Container): Router {
  const router = Router();
  const { auth, repos } = container;
  const controller = container.controllers.similar;
  const byPost = validate({ params: postIdParamsSchema });
  router.get(
    '/posts/:postId/similar',
    noStore(),
    requireSession(auth),
    byPost,
    controller.forMember,
  );
  router.get(
    '/studio/posts/:postId/similar',
    noStore(),
    requireOwner({ auth, spaces: repos.spaces, memberships: repos.memberships }),
    byPost,
    controller.forOwner,
  );
  return router;
}
