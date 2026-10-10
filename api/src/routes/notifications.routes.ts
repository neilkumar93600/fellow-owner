import {
  markNotificationsReadSchema,
  notificationsQuerySchema,
  unreadNotificationsQuerySchema,
} from '@fellow-owners/shared';
import { Router } from 'express';
import type { Container } from '../container.js';
import { noStore } from '../lib/http.js';
import { requireSession } from '../middlewares/require-session.js';
import { validate } from '../middlewares/validate.js';

/** /api/notifications/*: the signed-in user's notifications (F21), owner and members alike. */
export function createNotificationsRoutes(container: Container): Router {
  const router = Router();
  const controller = container.controllers.notifications;
  const session = requireSession(container.auth);

  router.use(noStore());

  router.get('/', session, validate({ query: notificationsQuerySchema }), controller.list);
  router.get(
    '/unread',
    session,
    validate({ query: unreadNotificationsQuerySchema }),
    controller.unread,
  );
  // Server-Sent Events: the live unread count for the bell (polling stays the fallback).
  router.get(
    '/stream',
    session,
    validate({ query: unreadNotificationsQuerySchema }),
    controller.stream,
  );
  router.post(
    '/read',
    session,
    validate({ body: markNotificationsReadSchema }),
    controller.markRead,
  );
  return router;
}
