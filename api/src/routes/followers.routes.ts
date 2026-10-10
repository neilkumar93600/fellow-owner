import {
  autoTagFollowersSchema,
  createFollowerSchema,
  followersQuerySchema,
  idParamsSchema,
  importFollowersSchema,
  tagFollowersSchema,
  updateFollowerSchema,
} from '@fellow-owners/shared';
import { Router } from 'express';
import type { Container } from '../container.js';
import { noStore } from '../lib/http.js';
import { requireOwner } from '../middlewares/require-owner.js';
import { validate } from '../middlewares/validate.js';

/**
 * /api/studio/followers/*: the owner's follower roster (F23). Mounted before /api/studio.
 * The import route accepts bodies up to 1mb (create-app.ts).
 */
export function createFollowersRoutes(container: Container): Router {
  const router = Router();
  const { auth, repos } = container;
  const controller = container.controllers.followers;
  const owner = requireOwner({ auth, spaces: repos.spaces, memberships: repos.memberships });

  router.use(noStore());

  router.get('/', owner, validate({ query: followersQuerySchema }), controller.list);
  router.post('/', owner, validate({ body: createFollowerSchema }), controller.create);
  router.post(
    '/import',
    owner,
    validate({ body: importFollowersSchema }),
    controller.importFollowers,
  );
  router.post('/tag', owner, validate({ body: tagFollowersSchema }), controller.tag);
  router.post('/auto-tag', owner, validate({ body: autoTagFollowersSchema }), controller.autoTag);
  router.patch(
    '/:id',
    owner,
    validate({ params: idParamsSchema, body: updateFollowerSchema }),
    controller.update,
  );
  router.delete('/:id', owner, validate({ params: idParamsSchema }), controller.remove);
  return router;
}
