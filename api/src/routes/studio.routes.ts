import {
  aiFeedbackSchema,
  communityDetailQuerySchema,
  createCommunitySchema,
  createPromotionSchema,
  createSpaceSchema,
  cursorQuerySchema,
  handleCheckQuerySchema,
  ideasQuerySchema,
  idParamsSchema,
  inboxQuerySchema,
  membershipParamsSchema,
  peopleQuerySchema,
  platformLookupSchema,
  promotionActionSchema,
  promotionPostParamsSchema,
  setPersonCommunitiesSchema,
  setupSuggestionsSchema,
  studioCommunityParamsSchema,
  studioPitchActionSchema,
  studioPostActionSchema,
  updateCommunitySchema,
  updateSettingsSchema,
} from '@fellow-owners/shared';
import { Router } from 'express';
import type { Container } from '../container.js';
import { createPlatformController } from '../controllers/platform.controller.js';
import { spotlightBodySchema } from '../controllers/studio.controller.js';
import { noStore } from '../lib/http.js';
import { redis } from '../lib/redis.js';
import { requireOwner } from '../middlewares/require-owner.js';
import { requireSession } from '../middlewares/require-session.js';
import { validate } from '../middlewares/validate.js';

/**
 * /api/studio/*: the owner's creator studio. requireOwner resolves the caller's own space from
 * the session (401 signed out, 404 no space yet), except POST /space, GET /handle-check and the
 * platform auto-fetch routes, which only need a session (onboarding).
 */
export function createStudioRoutes(container: Container): Router {
  const router = Router();
  const { auth, repos } = container;
  const controller = container.controllers.studio;
  const session = requireSession(auth);
  const owner = requireOwner({ auth, spaces: repos.spaces, memberships: repos.memberships });
  const byId = validate({ params: idParamsSchema });

  router.use(noStore());

  // Onboarding and settings
  router.get(
    '/handle-check',
    session,
    validate({ query: handleCheckQuerySchema }),
    controller.handleCheck,
  );
  router.post('/space', session, validate({ body: createSpaceSchema }), controller.createSpace);

  // Platform auto-fetch (onboarding): rate limited per user inside the controller.
  const platform = createPlatformController({
    env: container.env,
    logger: container.logger,
    ai: container.ai,
    redis,
  });
  router.post(
    '/platform-lookup',
    session,
    validate({ body: platformLookupSchema }),
    platform.lookup,
  );
  router.post(
    '/setup-suggestions',
    session,
    validate({ body: setupSuggestionsSchema }),
    platform.setupSuggestions,
  );
  router.get('/space', owner, controller.getSpace);
  router.put(
    '/settings',
    owner,
    validate({ body: updateSettingsSchema }),
    controller.updateSettings,
  );

  // Today
  router.get('/overview', owner, controller.overview);
  router.post('/sweep', owner, controller.sweep);
  router.get('/briefing', owner, controller.briefing);
  router.post('/briefing/regenerate', owner, controller.regenerateBriefing);
  router.post('/feedback', owner, validate({ body: aiFeedbackSchema }), controller.feedback);

  // Inbox
  router.get('/inbox', owner, validate({ query: inboxQuerySchema }), controller.inbox);
  router.get('/inbox/:id', owner, byId, controller.inboxDetail);
  router.patch(
    '/inbox/:id',
    owner,
    validate({ params: idParamsSchema, body: studioPitchActionSchema }),
    controller.inboxAction,
  );
  router.post('/inbox/:id/suggest-reply', owner, byId, controller.suggestReply);

  // Ideas and posts
  router.get('/ideas', owner, validate({ query: ideasQuerySchema }), controller.ideas);
  router.get('/posts/:id', owner, byId, controller.postDetail);
  router.patch(
    '/posts/:id',
    owner,
    validate({ params: idParamsSchema, body: studioPostActionSchema }),
    controller.postAction,
  );
  router.post('/posts/:id/love', owner, byId, controller.lovePost);
  router.delete('/posts/:id/love', owner, byId, controller.unlovePost);

  // People
  router.get('/people', owner, validate({ query: peopleQuerySchema }), controller.people);
  router.delete(
    '/people/:membershipId',
    owner,
    validate({ params: membershipParamsSchema }),
    controller.removePerson,
  );
  router.put(
    '/people/:membershipId/communities',
    owner,
    validate({ params: membershipParamsSchema, body: setPersonCommunitiesSchema }),
    controller.setPersonCommunities,
  );
  const byMembership = validate({ params: membershipParamsSchema });
  router.post(
    '/people/:membershipId/spotlight/draft',
    owner,
    byMembership,
    controller.draftSpotlight,
  );
  router.put(
    '/people/:membershipId/spotlight',
    owner,
    validate({ params: membershipParamsSchema, body: spotlightBodySchema }),
    controller.setSpotlight,
  );
  router.delete('/people/:membershipId/spotlight', owner, byMembership, controller.clearSpotlight);

  // Communities
  router.get('/communities', owner, controller.communities);
  router.post(
    '/communities',
    owner,
    validate({ body: createCommunitySchema }),
    controller.createCommunity,
  );
  router.get(
    '/communities/:slug',
    owner,
    validate({ params: studioCommunityParamsSchema, query: communityDetailQuerySchema }),
    controller.communityDetail,
  );
  router.patch(
    '/communities/:id',
    owner,
    validate({ params: idParamsSchema, body: updateCommunitySchema }),
    controller.updateCommunity,
  );

  // Promotions
  router.get('/promotions', owner, validate({ query: cursorQuerySchema }), controller.promotions);
  router.get(
    '/promotions/post/:postId',
    owner,
    validate({ params: promotionPostParamsSchema }),
    controller.promotionComposer,
  );
  router.post(
    '/promotions',
    owner,
    validate({ body: createPromotionSchema }),
    controller.createPromotion,
  );
  router.patch(
    '/promotions/:id',
    owner,
    validate({ params: idParamsSchema, body: promotionActionSchema }),
    controller.promotionAction,
  );
  return router;
}
