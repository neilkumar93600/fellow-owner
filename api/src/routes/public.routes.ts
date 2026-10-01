import {
  handleParamsSchema,
  shortLinkQuerySchema,
  showcaseParamsSchema,
} from '@fellow-owners/shared';
import { Router } from 'express';
import type { Container } from '../container.js';
import { validate } from '../middlewares/validate.js';

/**
 * Public API (mounted at /api): GET /spaces/:handle (bio page, cached 60s) and
 * GET /spaces/:handle/showcase/:slug. No session is read here: the responses are CDN-cached and
 * must never carry a Set-Cookie.
 */
export function createPublicRoutes(container: Container): Router {
  const router = Router();
  const controller = container.controllers.public;
  router.get('/spaces/:handle', validate({ params: handleParamsSchema }), controller.spacePage);
  router.get(
    '/spaces/:handle/showcase/:slug',
    validate({ params: showcaseParamsSchema }),
    controller.showcase,
  );
  return router;
}

/** Root-level short links (mounted at /): GET /r/:code -> 302 to the showcase. */
export function createShortLinkRoutes(container: Container): Router {
  const router = Router();
  const controller = container.controllers.public;
  router.get('/r/:code', validate({ query: shortLinkQuerySchema }), controller.shortLink);
  return router;
}
