import { handleParamsSchema, metricsQuerySchema } from '@fellow-owners/shared';
import { Router } from 'express';
import type { Container } from '../container.js';
import { noStore } from '../lib/http.js';
import { createRateLimit } from '../middlewares/rate-limit.js';
import { requireOwner } from '../middlewares/require-owner.js';
import { validate } from '../middlewares/validate.js';

/** Bio-page visits one IP may report per minute. */
export const VISITS_PER_MINUTE = 30;

/** POST /api/spaces/:handle/visit (public beacon). Shares /api/spaces: per-route middleware. */
export function createVisitRoutes(container: Container): Router {
  const router = Router();
  router.post(
    '/:handle/visit',
    noStore(),
    createRateLimit({
      name: 'visit',
      windowSeconds: 60,
      max: VISITS_PER_MINUTE,
    }),
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
