import {
  challengeEntrySchema,
  challengeParamsSchema,
  challengeWinnerSchema,
  createChallengeSchema,
  handleParamsSchema,
} from '@fellow-owners/shared';
import { Router } from 'express';
import type { Container } from '../container.js';
import { noStore } from '../lib/http.js';
import { requireMember } from '../middlewares/require-member.js';
import { requireOwner } from '../middlewares/require-owner.js';
import { validate } from '../middlewares/validate.js';

/** /api/studio/challenges/*: the owner's challenges (401 signed out, 404 no space yet). */
export function createStudioChallengesRoutes(container: Container): Router {
  const router = Router();
  const { auth, repos } = container;
  const controller = container.controllers.challenges;
  const owner = requireOwner({ auth, spaces: repos.spaces, memberships: repos.memberships });
  const byId = validate({ params: challengeParamsSchema });

  router.use(noStore());
  router.get('/', owner, controller.list);
  router.post('/', owner, validate({ body: createChallengeSchema }), controller.create);
  router.get('/:id', owner, byId, controller.detail);
  router.post('/:id/close', owner, byId, controller.close);
  router.post(
    '/:id/winner',
    owner,
    validate({ params: challengeParamsSchema, body: challengeWinnerSchema }),
    controller.winner,
  );
  return router;
}

/** /api/spaces/:handle/challenges/*: members of the space (401 signed out, 403 not a member). */
export function createSpaceChallengesRoutes(container: Container): Router {
  const router = Router();
  const { auth, repos } = container;
  const controller = container.controllers.challenges;
  const member = requireMember({ auth, spaces: repos.spaces, memberships: repos.memberships });

  router.use('/:handle/challenges', noStore());
  router.get(
    '/:handle/challenges',
    member,
    validate({ params: handleParamsSchema }),
    controller.listForFans,
  );
  router.post(
    '/:handle/challenges/:id/entries',
    member,
    validate({
      params: handleParamsSchema.extend(challengeParamsSchema.shape),
      body: challengeEntrySchema,
    }),
    controller.enter,
  );
  return router;
}
