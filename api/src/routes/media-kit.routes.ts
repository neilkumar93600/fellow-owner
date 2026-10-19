import { handleParamsSchema, updateMediaKitSchema } from '@fellow-owners/shared';
import { Router } from 'express';
import type { Container } from '../container.js';
import { noStore } from '../lib/http.js';
import { demoReadOnly } from '../middlewares/demo-read-only.js';
import { createRateLimit } from '../middlewares/rate-limit.js';
import { requireSpaceOwner } from '../middlewares/require-owner.js';
import { validate } from '../middlewares/validate.js';
import { PUBLIC_READS_PER_MINUTE } from './public.routes.js';

/**
 * F6 Media kit under /api/spaces/:handle:
 *   GET   /media-kit          public, 404 while off, CDN-cached -> MediaKit
 *   GET   /media-kit/preview  owner, even while off            -> MediaKit
 *   PATCH /media-kit          owner { enabled, rates, note }   -> MediaKitSettings
 * The public read shares the per-IP `public` bucket with the bio page and never reads the session
 * (no Set-Cookie on a cached response). Mounted on /api/spaces: per-route middleware only.
 */
export function createMediaKitRoutes(container: Container): Router {
  const router = Router();
  const { auth, repos } = container;
  const controller = container.controllers.mediaKit;
  const owner = requireSpaceOwner({ auth, spaces: repos.spaces, memberships: repos.memberships });

  router.get(
    '/:handle/media-kit',
    createRateLimit({ name: 'public', windowSeconds: 60, max: PUBLIC_READS_PER_MINUTE }),
    validate({ params: handleParamsSchema }),
    controller.publicKit,
  );
  router.get(
    '/:handle/media-kit/preview',
    noStore(),
    owner,
    validate({ params: handleParamsSchema }),
    controller.preview,
  );
  router.patch(
    '/:handle/media-kit',
    noStore(),
    owner,
    demoReadOnly(container.env),
    validate({ params: handleParamsSchema, body: updateMediaKitSchema }),
    controller.updateSettings,
  );
  return router;
}
