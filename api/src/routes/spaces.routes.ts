import {
  communityParamsSchema,
  createPitchSchema,
  createPostSchema,
  feedQuerySchema,
  handleParamsSchema,
  joinSpaceSchema,
  suggestCommunitiesSchema,
  updateMembershipSchema,
} from '@fellow-owners/shared';
import { Router } from 'express';
import type { Container } from '../container.js';
import { noStore } from '../lib/http.js';
import { requireMember } from '../middlewares/require-member.js';
import { attachSession, requireSession } from '../middlewares/require-session.js';
import { validate } from '../middlewares/validate.js';

/**
 * /api/spaces/:handle/* member side: membership, suggest-communities, join, me, feeds, new post, pitch.
 * Guards: membership (signed out allowed), session (suggest, join, feed, pitch), member (me, post).
 * GET /api/spaces/:handle itself is the public bio page (public.routes.ts).
 */
export function createSpacesRoutes(container: Container): Router {
  const router = Router();
  const { auth, repos } = container;
  const controller = container.controllers.spaces;
  const session = requireSession(auth);
  const member = requireMember({ auth, spaces: repos.spaces, memberships: repos.memberships });
  const handle = validate({ params: handleParamsSchema });

  router.use(noStore());

  router.get('/:handle/membership', attachSession(auth), handle, controller.membership);
  router.post(
    '/:handle/suggest-communities',
    session,
    validate({ params: handleParamsSchema, body: suggestCommunitiesSchema }),
    controller.suggestCommunities,
  );
  router.post(
    '/:handle/join',
    session,
    validate({ params: handleParamsSchema, body: joinSpaceSchema }),
    controller.join,
  );
  router.get('/:handle/me', member, handle, controller.me);
  router.patch(
    '/:handle/me',
    member,
    validate({ params: handleParamsSchema, body: updateMembershipSchema }),
    controller.updateMe,
  );
  router.get(
    '/:handle/communities/:slug/posts',
    session,
    validate({ params: communityParamsSchema, query: feedQuerySchema }),
    controller.feed,
  );
  router.post(
    '/:handle/posts',
    member,
    validate({ params: handleParamsSchema, body: createPostSchema }),
    controller.createPost,
  );
  router.post(
    '/:handle/pitches',
    session,
    validate({ params: handleParamsSchema, body: createPitchSchema }),
    controller.createPitch,
  );
  return router;
}
