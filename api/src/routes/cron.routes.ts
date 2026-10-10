import { Router } from 'express';
import type { Container } from '../container.js';
import { noStore } from '../lib/http.js';
import { cronAuth } from '../middlewares/cron-auth.js';
import { validate } from '../middlewares/validate.js';
import { tickQuerySchema } from '../workers/tick.js';

/**
 * /api/cron/* (Bearer CRON_SECRET): the hourly tick (Railway cron) and its run log, plus manual
 * triggers for demo-reset, retention purge and the follower refresh. GET and POST both work.
 */
export function createCronRoutes(container: Container): Router {
  const router = Router();
  const controller = container.controllers.cron;
  const tickQuery = validate({ query: tickQuerySchema });

  router.use(cronAuth(container.env.CRON_SECRET));
  router.use(noStore());
  router.route('/tick').get(tickQuery, controller.tick).post(tickQuery, controller.tick);
  router.get('/status', controller.status);
  router.route('/demo-reset').get(controller.demoReset).post(controller.demoReset);
  router.route('/purge').get(controller.purge).post(controller.purge);
  router
    .route('/refresh-followers')
    .get(controller.refreshFollowers)
    .post(controller.refreshFollowers);
  return router;
}
