import { supportRequestSchema } from '@fellow-owners/shared';
import { Router } from 'express';
import type { Container } from '../container.js';
import { noStore } from '../lib/http.js';
import { createRateLimit } from '../middlewares/rate-limit.js';
import { attachSession } from '../middlewares/require-session.js';
import { validate } from '../middlewares/validate.js';

/**
 * POST /api/support/requests (public, 5 an hour per IP; the session, when there is one, sets
 * support_requests.user_id). The emails it sends have their own IP-independent caps
 * (support.service.ts).
 */
export function createSupportRoutes(container: Container): Router {
  const router = Router();
  router.use(noStore());
  router.post(
    '/requests',
    createRateLimit({
      name: 'support',
      windowSeconds: 3600,
      max: 5,
    }),
    validate({ body: supportRequestSchema }),
    attachSession(container.auth),
    container.controllers.support.submit,
  );
  return router;
}
