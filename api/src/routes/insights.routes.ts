import { communityActivityQuerySchema, exportParamsSchema } from '@fellow-owners/shared';
import { type RequestHandler, Router } from 'express';
import type { Container } from '../container.js';
import { noStore } from '../lib/http.js';
import { requireOwner } from '../middlewares/require-owner.js';
import { validate } from '../middlewares/validate.js';

function ownerGuard(container: Container): RequestHandler {
  const { auth, repos } = container;
  return requireOwner({ auth, spaces: repos.spaces, memberships: repos.memberships });
}

/** /api/studio/analytics/*: community activity. Mounted before /api/studio. */
export function createAnalyticsRoutes(container: Container): Router {
  const router = Router();
  const controller = container.controllers.insights;

  router.use(noStore());
  router.get(
    '/communities',
    ownerGuard(container),
    validate({ query: communityActivityQuerySchema }),
    controller.communityActivity,
  );
  return router;
}

/** /api/studio/export/:kind: CSV downloads. Mounted before /api/studio. */
export function createExportRoutes(container: Container): Router {
  const router = Router();
  const controller = container.controllers.insights;

  router.use(noStore());
  router.get(
    '/:kind',
    ownerGuard(container),
    validate({ params: exportParamsSchema }),
    controller.exportCsv,
  );
  return router;
}
