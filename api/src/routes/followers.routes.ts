import {
  autoTagFollowersSchema,
  createFollowerSchema,
  followersQuerySchema,
  idParamsSchema,
  importFollowersSchema,
  tagFollowersSchema,
  updateFollowerSchema,
  youtubeImportSchema,
} from '@fellow-owners/shared';
import { type RequestHandler, Router } from 'express';
import type { Container } from '../container.js';
import { noStore } from '../lib/http.js';
import { parseChannelUrl } from '../lib/youtube.js';
import { createCap } from '../middlewares/rate-limit.js';
import { requireOwner } from '../middlewares/require-owner.js';
import { bodyOf, validate } from '../middlewares/validate.js';

/**
 * YouTube imports a day: each costs up to ~12 units of the platform's one shared YouTube Data API
 * key (10,000 units a day), so one space must not use it up for everyone.
 */
export const YOUTUBE_IMPORTS_PER_DAY = { space: 3, all: 50 } as const;

/**
 * /api/studio/followers/*: the owner's follower roster (F23). Mounted before /api/studio.
 * The import route accepts bodies up to 1mb (create-app.ts).
 */
export function createFollowersRoutes(container: Container): Router {
  const router = Router();
  const { auth, repos } = container;
  const controller = container.controllers.followers;
  const owner = requireOwner({ auth, spaces: repos.spaces, memberships: repos.memberships });

  // Live imports of a real channel link only (sample data and a mistyped link cost no quota).
  // Per space first, so a space over its own cap does not use up the shared one.
  const perSpace = createCap({
    name: 'youtube-import-space',
    windowSeconds: 86_400,
    max: YOUTUBE_IMPORTS_PER_DAY.space,
    key: (req) => req.space?.id ?? 'unknown',
  });
  const shared = createCap({
    name: 'youtube-import-day',
    windowSeconds: 86_400,
    max: YOUTUBE_IMPORTS_PER_DAY.all,
    key: () => 'all',
  });
  const youtubeCaps: RequestHandler[] = [perSpace, shared].map(
    (cap): RequestHandler =>
      (req, res, next) =>
        container.env.YOUTUBE_ENABLED &&
        parseChannelUrl(bodyOf(req, youtubeImportSchema).channelUrl)
          ? cap(req, res, next)
          : next(),
  );

  router.use(noStore());

  router.get('/', owner, validate({ query: followersQuerySchema }), controller.list);
  router.post('/', owner, validate({ body: createFollowerSchema }), controller.create);
  router.post(
    '/import',
    owner,
    validate({ body: importFollowersSchema }),
    controller.importFollowers,
  );
  router.post(
    '/import/youtube',
    owner,
    validate({ body: youtubeImportSchema }),
    youtubeCaps,
    controller.importYoutube,
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
