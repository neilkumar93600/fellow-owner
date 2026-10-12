import {
  BRAND_LIMITS,
  brandRequestsQuerySchema,
  handleIdParamsSchema,
  handleParamsSchema,
  inboundEmailSchema,
  updateBrandRequestSchema,
  workWithMeSchema,
} from '@fellow-owners/shared';
import { type RequestHandler, Router } from 'express';
import type { Container } from '../container.js';
import { featureDisabled } from '../lib/errors.js';
import { noStore } from '../lib/http.js';
import { createCap, createRateLimit } from '../middlewares/rate-limit.js';
import { requireSpaceOwner } from '../middlewares/require-owner.js';
import { validate } from '../middlewares/validate.js';
import { requireSignature } from '../middlewares/webhook-signature.js';

/**
 * F5 owner routes under /api/spaces/:handle (requireSpaceOwner):
 *   GET   /brand-requests  ?status&source&q&cursor&limit  -> BrandRequestsPage
 *   GET   /brand-requests/:id                             -> BrandRequestDetail (marks read)
 *   PATCH /brand-requests/:id   { status }                -> BrandRequest
 *   GET   /brand-pick                                     -> BrandPick (Today's "Don't miss")
 *   GET   /brand-settings                                 -> BrandSettings
 *   POST  /brand-settings/alias                           -> BrandSettings (new forwarding alias)
 * Mounted on /api/spaces before spaces.routes: per-route middleware only.
 */
export function createBrandsRoutes(container: Container): Router {
  const router = Router();
  const { auth, repos } = container;
  const controller = container.controllers.brands;
  const owner = requireSpaceOwner({ auth, spaces: repos.spaces, memberships: repos.memberships });
  const guard = [noStore(), owner];
  const byHandle = validate({ params: handleParamsSchema });

  router.get(
    '/:handle/brand-requests',
    guard,
    validate({ params: handleParamsSchema, query: brandRequestsQuerySchema }),
    controller.list,
  );
  router.get(
    '/:handle/brand-requests/:id',
    guard,
    validate({ params: handleIdParamsSchema }),
    controller.get,
  );
  router.patch(
    '/:handle/brand-requests/:id',
    guard,
    validate({ params: handleIdParamsSchema, body: updateBrandRequestSchema }),
    controller.update,
  );
  router.get('/:handle/brand-pick', guard, byHandle, controller.pick);
  router.get('/:handle/brand-settings', guard, byHandle, controller.settings);
  router.post('/:handle/brand-settings/alias', guard, byHandle, controller.rotateAlias);
  return router;
}

/**
 * F5 public form: POST /api/spaces/:handle/work-with-me. Strict limits: per IP (3 per 10 min) and
 * per space (50 a day, counted after validation so junk does not use it up). Turnstile is checked
 * by the service when TURNSTILE_SECRET_KEY is set. Mounted on /api/spaces: per-route middleware only.
 */
export function createWorkWithMeRoutes(container: Container): Router {
  const router = Router();
  router.post(
    '/:handle/work-with-me',
    noStore(),
    createRateLimit({
      name: 'work-with-me',
      windowSeconds: 600,
      max: BRAND_LIMITS.formPerIpPer10Min,
    }),
    validate({ params: handleParamsSchema, body: workWithMeSchema }),
    createCap({
      name: 'work-with-me-space',
      windowSeconds: 86_400,
      max: BRAND_LIMITS.formPerSpacePerDay,
      key: (req) => String(req.params.handle),
    }),
    container.controllers.brands.submit,
  );
  return router;
}

/**
 * F5 forwarded email: POST /api/inbound/email, signed with INBOUND_EMAIL_SECRET
 * (`x-inbound-signature`: hex HMAC-SHA256 of the raw body). 503 feature_disabled until
 * INBOUND_EMAIL_DOMAIN and INBOUND_EMAIL_SECRET are set.
 */
export function createInboundEmailRoutes(container: Container): Router {
  const router = Router();
  const { env } = container;
  const enabled: RequestHandler = (_req, _res, next) => {
    if (!env.INBOUND_EMAIL_ENABLED) throw featureDisabled('Email forwarding');
    next();
  };
  router.post(
    '/email',
    noStore(),
    enabled,
    createRateLimit({ name: 'inbound-email', windowSeconds: 60, max: 120 }),
    requireSignature({ header: 'x-inbound-signature', secret: () => env.INBOUND_EMAIL_SECRET }),
    validate({ body: inboundEmailSchema }),
    container.controllers.brands.receiveEmail,
  );
  return router;
}
