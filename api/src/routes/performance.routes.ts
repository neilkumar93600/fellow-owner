import {
  handleParamsSchema,
  performancePostsQuerySchema,
  performanceQuerySchema,
} from '@fellow-owners/shared';
import { Router } from 'express';
import type { Container } from '../container.js';
import { noStore } from '../lib/http.js';
import { requireSpaceOwner } from '../middlewares/require-owner.js';
import { validate } from '../middlewares/validate.js';

/**
 * F1/F2 (owner): GET /api/spaces/:handle/performance?days=&tz=, GET .../performance/posts and
 * GET .../profile-score. Mounted on /api/spaces before spaces.routes: per-route middleware only.
 */
export function createPerformanceRoutes(container: Container): Router {
  const router = Router();
  const { auth, repos } = container;
  const controller = container.controllers.performance;
  const owner = requireSpaceOwner({ auth, spaces: repos.spaces, memberships: repos.memberships });

  router.get(
    '/:handle/performance',
    noStore(),
    owner,
    validate({ params: handleParamsSchema, query: performanceQuerySchema }),
    controller.summary,
  );
  router.get(
    '/:handle/performance/posts',
    noStore(),
    owner,
    validate({ params: handleParamsSchema, query: performancePostsQuerySchema }),
    controller.posts,
  );
  router.get(
    '/:handle/profile-score',
    noStore(),
    owner,
    validate({ params: handleParamsSchema }),
    controller.profileScore,
  );
  return router;
}
