import {
  handleParamsSchema,
  instagramCallbackQuerySchema,
  instagramVerifyQuerySchema,
  instagramWebhookSchema,
} from '@fellow-owners/shared';
import { type RequestHandler, Router } from 'express';
import type { Container } from '../container.js';
import { featureDisabled } from '../lib/errors.js';
import { noStore } from '../lib/http.js';
import { createRateLimit } from '../middlewares/rate-limit.js';
import { requireSpaceOwner } from '../middlewares/require-owner.js';
import { attachSession } from '../middlewares/require-session.js';
import { validate } from '../middlewares/validate.js';
import { requireSignature } from '../middlewares/webhook-signature.js';

/** The META switch: every Instagram route is 503 feature_disabled until META_* are all set. */
function metaSwitch(container: Container): RequestHandler {
  return (_req, _res, next) => {
    if (!container.env.INSTAGRAM_ENABLED) throw featureDisabled('Instagram messages');
    next();
  };
}

/**
 * F5 owner routes under /api/spaces/:handle (requireSpaceOwner):
 *   POST   /instagram/connect -> InstagramConnectStart
 *   DELETE /instagram         -> 204
 * Mounted on /api/spaces before spaces.routes: per-route middleware only.
 */
export function createInstagramOwnerRoutes(container: Container): Router {
  const router = Router();
  const { auth, repos } = container;
  const controller = container.controllers.instagram;
  const owner = requireSpaceOwner({ auth, spaces: repos.spaces, memberships: repos.memberships });
  // Signed out is 401 whatever the switch says; the owner then learns whether it is set up.
  const guard = [noStore(), owner, metaSwitch(container), validate({ params: handleParamsSchema })];

  router.post('/:handle/instagram/connect', guard, controller.connectStart);
  router.delete('/:handle/instagram', guard, controller.disconnect);
  return router;
}

/**
 * GET /api/instagram/callback: Meta's OAuth redirect (fixed URI {WEB_ORIGIN}/api/instagram/callback,
 * registered in the Meta app). The signed state names the space; the session, when present, must
 * match it. Ends in a 302 to the web.
 */
export function createInstagramCallbackRoutes(container: Container): Router {
  const router = Router();
  router.get(
    '/callback',
    noStore(),
    metaSwitch(container),
    attachSession(container.auth),
    validate({ query: instagramCallbackQuerySchema }),
    container.controllers.instagram.callback,
  );
  return router;
}

/**
 * Meta's webhook for the Instagram app:
 *   GET  /api/webhooks/instagram  hub.mode=subscribe&hub.verify_token&hub.challenge -> challenge
 *   POST /api/webhooks/instagram  signed `x-hub-signature-256: sha256=<hex>` (META_APP_SECRET)
 */
export function createInstagramWebhookRoutes(container: Container): Router {
  const router = Router();
  const controller = container.controllers.instagram;
  const limit = createRateLimit({ name: 'instagram-webhook', windowSeconds: 60, max: 300 });

  router.get(
    '/instagram',
    noStore(),
    metaSwitch(container),
    limit,
    validate({ query: instagramVerifyQuerySchema }),
    controller.verify,
  );
  router.post(
    '/instagram',
    noStore(),
    metaSwitch(container),
    limit,
    requireSignature({
      header: 'x-hub-signature-256',
      prefix: 'sha256=',
      secret: () => container.env.META_APP_SECRET,
    }),
    validate({ body: instagramWebhookSchema }),
    controller.receive,
  );
  return router;
}
