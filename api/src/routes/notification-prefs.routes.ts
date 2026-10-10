import { newsletterTokenQuerySchema, notificationPrefsSchema } from '@fellow-owners/shared';
import { Router } from 'express';
import type { Container } from '../container.js';
import { noStore } from '../lib/http.js';
import { requireSession } from '../middlewares/require-session.js';
import { validate } from '../middlewares/validate.js';

/** GET /api/email/unsubscribe?token= (public, signed token; one-click from every email). */
export function createEmailRoutes(container: Container): Router {
  const router = Router();
  router.get(
    '/unsubscribe',
    noStore(),
    validate({ query: newsletterTokenQuerySchema }),
    container.controllers.notificationPrefs.unsubscribe,
  );
  return router;
}

/** GET/PUT /api/me/notification-prefs (session). */
export function createNotificationPrefsRoutes(container: Container): Router {
  const router = Router();
  const controller = container.controllers.notificationPrefs;
  router.use(noStore(), requireSession(container.auth));
  router.get('/notification-prefs', controller.get);
  router.put('/notification-prefs', validate({ body: notificationPrefsSchema }), controller.update);
  return router;
}
