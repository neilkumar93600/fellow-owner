import { newsletterSubscribeSchema } from '@fellow-owners/shared';
import { Router } from 'express';
import type { Container } from '../container.js';
import { createRateLimit } from '../middlewares/rate-limit.js';
import { validate } from '../middlewares/validate.js';

/** POST /api/newsletter sign-ups one client (IP) may make per minute. */
export const NEWSLETTER_PER_MINUTE = 5;

/**
 * POST /api/newsletter (public, per IP; confirm emails also have IP-independent caps in the
 * service). Confirm and unsubscribe change state on POST only: a GET redirects to the web page
 * with the button, so mail link scanners change nothing. POST /unsubscribe is also the RFC 8058
 * one-click target (`List-Unsubscribe=One-Click` body, token in the URL).
 */
export function createNewsletterRoutes(container: Container): Router {
  const router = Router();
  const controller = container.controllers.newsletter;
  router.post(
    '/',
    createRateLimit({
      name: 'newsletter',
      windowSeconds: 60,
      max: NEWSLETTER_PER_MINUTE,
    }),
    validate({ body: newsletterSubscribeSchema }),
    controller.subscribe,
  );
  router.get('/confirm', controller.confirmPage);
  router.get('/unsubscribe', controller.unsubscribePage);
  router.post('/confirm', controller.confirm);
  router.post('/unsubscribe', controller.unsubscribe);
  return router;
}
