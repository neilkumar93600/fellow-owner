import { demoSessionSchema } from '@fellow-owners/shared';
import { Router } from 'express';
import type { Container } from '../container.js';
import { noStore } from '../lib/http.js';
import { validate } from '../middlewares/validate.js';

/**
 * POST /api/demo/session (DEMO_* env, forwards Better Auth Set-Cookie).
 * Mounted by routes/index.ts. Handlers: validate(...) with the shared schemas, guards from
 * middlewares/, then one controller method from container.controllers.
 */
export function createDemoRoutes(container: Container): Router {
  const router = Router();
  const controller = container.controllers.demo;

  router.use(noStore());
  router.post('/session', validate({ body: demoSessionSchema }), controller.session);
  return router;
}
