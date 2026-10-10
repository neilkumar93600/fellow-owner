import { Router } from 'express';
import type { Container } from '../container.js';
import { noStore } from '../lib/http.js';
import { cronAuth } from '../middlewares/cron-auth.js';

/**
 * /api/cron/* (Bearer CRON_SECRET): demo-reset, retention purge and the follower refresh. Vercel Cron calls with GET,
 * the contract documents POST: register both methods for each path.
 */
export function createCronRoutes(container: Container): Router {
  const router = Router();
  const controller = container.controllers.cron;

  router.use(cronAuth(container.env.CRON_SECRET));
  router.use(noStore());
  router.route('/demo-reset').get(controller.demoReset).post(controller.demoReset);
  router.route('/purge').get(controller.purge).post(controller.purge);
  router
    .route('/refresh-followers')
    .get(controller.refreshFollowers)
    .post(controller.refreshFollowers);
  return router;
}
