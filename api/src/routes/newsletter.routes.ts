import { newsletterSubscribeSchema } from '@fellow-owners/shared';
import { Router } from 'express';
import type { Container } from '../container.js';
import { validate } from '../middlewares/validate.js';

/** POST /api/newsletter (public, rate-limited per IP in the controller). */
export function createNewsletterRoutes(container: Container): Router {
  const router = Router();
  router.post(
    '/',
    validate({ body: newsletterSubscribeSchema }),
    container.controllers.newsletter.subscribe,
  );
  return router;
}
