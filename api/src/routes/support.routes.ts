import { supportRequestSchema } from '@fellow-owners/shared';
import { Router } from 'express';
import type { Container } from '../container.js';
import { noStore } from '../lib/http.js';
import { validate } from '../middlewares/validate.js';

/** POST /api/support/requests (public). */
export function createSupportRoutes(container: Container): Router {
  const router = Router();
  router.use(noStore());
  router.post(
    '/requests',
    validate({ body: supportRequestSchema }),
    container.controllers.support.submit,
  );
  return router;
}
