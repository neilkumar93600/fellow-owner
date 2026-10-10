import { supportRequestSchema } from '@fellow-owners/shared';
import { Router } from 'express';
import type { Container } from '../container.js';
import { noStore } from '../lib/http.js';
import { createRateLimit } from '../middlewares/rate-limit.js';
import { validate } from '../middlewares/validate.js';

/** POST /api/support/requests (public, 5 an hour per IP). */
export function createSupportRoutes(container: Container): Router {
  const router = Router();
  router.use(noStore());
  router.post(
    '/requests',
    createRateLimit({
      name: 'support',
      windowSeconds: 3600,
      max: 5,
      key: (req) => req.ip ?? 'unknown',
    }),
    validate({ body: supportRequestSchema }),
    container.controllers.support.submit,
  );
  return router;
}
