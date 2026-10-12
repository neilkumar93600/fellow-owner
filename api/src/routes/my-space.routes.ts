import { beforeQuerySchema, handleParamsSchema } from '@fellow-owners/shared';
import { Router } from 'express';
import type { Container } from '../container.js';
import { noStore } from '../lib/http.js';
import { requireMember } from '../middlewares/require-member.js';
import { validate } from '../middlewares/validate.js';

/**
 * /api/spaces/:handle/me/{posts,pitches}: My space "Show more". GET /me holds the first
 * MY_SPACE_FIRST_PAGE of each; these page on with `before` (the oldest id the client holds).
 */
export function createMySpaceRoutes(container: Container): Router {
  const router = Router();
  const { auth, repos } = container;
  const controller = container.controllers.spaces;
  const member = requireMember({ auth, spaces: repos.spaces, memberships: repos.memberships });
  const paged = validate({ params: handleParamsSchema, query: beforeQuerySchema });

  router.get('/:handle/me/posts', noStore(), member, paged, controller.myPosts);
  router.get('/:handle/me/pitches', noStore(), member, paged, controller.myPitches);
  return router;
}
