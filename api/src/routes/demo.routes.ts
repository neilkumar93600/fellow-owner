import { Router } from 'express';
import type { Container } from '../container.js';

/**
 * POST /api/demo/session (DEMO_* env, forwards Better Auth Set-Cookie).
 * Mounted by routes/index.ts. Handlers: validate(...) with the shared schemas, guards from
 * middlewares/, then one controller method from container.controllers.
 */
export function createDemoRoutes(_container: Container): Router {
  const router = Router();
  return router;
}
