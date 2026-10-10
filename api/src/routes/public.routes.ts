import {
  handleAvailableQuerySchema,
  handleParamsSchema,
  shortLinkQuerySchema,
  showcaseParamsSchema,
} from '@fellow-owners/shared';
import { type Request, Router } from 'express';
import type { Container } from '../container.js';
import { HANDLE_AVAILABLE_PER_MINUTE } from '../controllers/public.controller.js';
import { createRateLimit } from '../middlewares/rate-limit.js';
import { validate } from '../middlewares/validate.js';

/** Public reads one IP may make per minute (bio page, showcase and short links share it). */
export const PUBLIC_READS_PER_MINUTE = 120;

const byIp = (req: Request) => req.ip ?? 'unknown';

/** One bucket per IP for every public read: both routers count into it (same limiter name). */
const publicReads = () =>
  createRateLimit({ name: 'public', windowSeconds: 60, max: PUBLIC_READS_PER_MINUTE, key: byIp });

/**
 * Public API (mounted at /api): GET /spaces/:handle (bio page, cached 60s),
 * GET /spaces/:handle/showcase/:slug and GET /handle-available?h= (never cached).
 * Rate limited per IP (Redis when set, in process otherwise). No session is read here: the
 * responses never carry a Set-Cookie.
 */
export function createPublicRoutes(container: Container): Router {
  const router = Router();
  const controller = container.controllers.public;
  const limit = publicReads();
  router.get(
    '/handle-available',
    createRateLimit({
      name: 'handle',
      windowSeconds: 60,
      max: HANDLE_AVAILABLE_PER_MINUTE,
      key: byIp,
    }),
    validate({ query: handleAvailableQuerySchema }),
    controller.handleAvailable,
  );
  router.get(
    '/spaces/:handle',
    limit,
    validate({ params: handleParamsSchema }),
    controller.spacePage,
  );
  router.get(
    '/spaces/:handle/showcase/:slug',
    limit,
    validate({ params: showcaseParamsSchema }),
    controller.showcase,
  );
  return router;
}

/** Root-level short links (mounted at /): GET /r/:code -> 302 to the showcase. */
export function createShortLinkRoutes(container: Container): Router {
  const router = Router();
  const controller = container.controllers.public;
  router.get(
    '/r/:code',
    publicReads(),
    validate({ query: shortLinkQuerySchema }),
    controller.shortLink,
  );
  return router;
}
