import { demoSessionSchema } from '@fellow-owners/shared';
import { Router } from 'express';
import type { Container } from '../container.js';
import { noStore } from '../lib/http.js';
import { createCap, createRateLimit } from '../middlewares/rate-limit.js';
import { validate } from '../middlewares/validate.js';

/**
 * Demo sign-ins one IP may start per minute. Sized for a room of judges behind one NAT (a venue
 * or office network), not one person.
 */
export const DEMO_SESSIONS_PER_MINUTE = 30;
/** Demo sign-ins one IP may start per hour (a tenth of the global cap, so one network cannot drain it). */
export const DEMO_SESSIONS_PER_IP_PER_HOUR = 150;
/** Demo sign-ins per hour in all: the per-IP limit alone can be dodged with a forged IP. */
export const DEMO_SESSIONS_PER_HOUR = 1500;

/**
 * POST /api/demo/session (DEMO_* env, forwards Better Auth Set-Cookie), rate limited per IP (per
 * minute and per hour) and capped per hour for everyone. Malformed bodies are rejected before the
 * cap, so they never use it up.
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
    }),
    createRateLimit({
      name: 'demo-session-ip-hour',
      windowSeconds: 3600,
      max: DEMO_SESSIONS_PER_IP_PER_HOUR,
    }),
    validate({ body: demoSessionSchema }),
    createCap({
      name: 'demo-session-hour',
      windowSeconds: 3600,
      max: DEMO_SESSIONS_PER_HOUR,
      key: () => 'all',
    }),
    controller.session,
  );
  return router;
}
