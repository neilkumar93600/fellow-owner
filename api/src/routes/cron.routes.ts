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
  // Ops check of the proxy chain (Vercel -> Railway): which client headers arrive, and the IP used.
  router.get('/ip', (req, res) => {
    res.json({
      clientIp: req.clientIp,
      edgeKey: Boolean(req.get('x-edge-key')),
      headers: Object.fromEntries(
        ['x-edge-client-ip', 'x-vercel-forwarded-for', 'x-forwarded-for', 'x-real-ip'].map(
          (name) => [name, req.get(name) ?? null],
        ),
      ),
    });
  });
  router.route('/demo-reset').get(controller.demoReset).post(controller.demoReset);
  router.route('/purge').get(controller.purge).post(controller.purge);
  router
    .route('/refresh-followers')
    .get(controller.refreshFollowers)
    .post(controller.refreshFollowers);
  return router;
}
