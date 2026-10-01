import { Router } from 'express';
import type { Container } from '../container.js';
import { cronAuth } from '../middlewares/cron-auth.js';

/**
 * /api/cron/* (Bearer CRON_SECRET): demo-reset and purge. Vercel Cron calls with GET, the
 * contract documents POST: register both methods for each path.
 */
export function createCronRoutes(container: Container): Router {
  const router = Router();
  router.use(cronAuth(container.env.CRON_SECRET));
  return router;
}
