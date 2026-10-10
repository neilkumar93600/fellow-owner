import { demoSessionSchema } from '@fellow-owners/shared';
import { Router } from 'express';
import type { Container } from '../container.js';
import { noStore } from '../lib/http.js';
import { createRateLimit } from '../middlewares/rate-limit.js';
import { validate } from '../middlewares/validate.js';

/** Demo sign-ins one IP may start per minute. */
export const DEMO_SESSIONS_PER_MINUTE = 10;

/**
 * POST /api/demo/session (DEMO_* env, forwards Better Auth Set-Cookie), rate limited per IP.
 * Mounted by routes/index.ts. Handlers: validate(...) with the shared schemas, guards from
 * middlewares/, then one controller method from container.controllers.
 */
export function createDemoRoutes(container: Container): Router {
  const router = Router();
  const controller = container.controllers.demo;

  router.use(noStore());
  router.post(
    '/session',
    createRateLimit({
      name: 'demo-session',
      windowSeconds: 60,
      max: DEMO_SESSIONS_PER_MINUTE,
      key: (req) => req.ip ?? 'unknown',
    }),
    validate({ body: demoSessionSchema }),
    controller.session,
  );
  return router;
}
