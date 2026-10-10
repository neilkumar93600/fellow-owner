import { handleParamsSchema, metricsQuerySchema } from '@fellow-owners/shared';
import { Router } from 'express';
import type { Container } from '../container.js';
import { noStore } from '../lib/http.js';
import { requireOwner } from '../middlewares/require-owner.js';
import { validate } from '../middlewares/validate.js';

/** POST /api/spaces/:handle/visit (public beacon). Shares /api/spaces: per-route middleware. */
export function createVisitRoutes(container: Container): Router {
  const router = Router();
  router.post(
    '/:handle/visit',
    noStore(),
    validate({ params: handleParamsSchema }),
    container.controllers.metrics.visit,
  );
  return router;
}

/** GET /api/studio/metrics?days=7|30 (owner). */
export function createMetricsRoutes(container: Container): Router {
  const router = Router();
  const { auth, repos } = container;
  router.use(
    noStore(),
    requireOwner({ auth, spaces: repos.spaces, memberships: repos.memberships }),
  );
  router.get('/', validate({ query: metricsQuerySchema }), container.controllers.metrics.studio);
  return router;
}
