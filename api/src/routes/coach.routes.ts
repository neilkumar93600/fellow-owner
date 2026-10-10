import { coachRequestSchema, handleParamsSchema } from '@fellow-owners/shared';
import { Router } from 'express';
import type { Container } from '../container.js';
import { noStore } from '../lib/http.js';
import { requireSession } from '../middlewares/require-session.js';
import { validate } from '../middlewares/validate.js';

/**
 * POST /api/spaces/:handle/coach (session). Mounted on /api/spaces before spaces.routes, so no
 * router.use here: per-route middleware only.
 */
export function createCoachRoutes(container: Container): Router {
  const router = Router();
  router.post(
    '/:handle/coach',
    noStore(),
    requireSession(container.auth),
    validate({ params: handleParamsSchema, body: coachRequestSchema }),
    container.controllers.coach.check,
  );
  return router;
}
