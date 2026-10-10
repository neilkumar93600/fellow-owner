import { askAiRequestSchema } from '@fellow-owners/shared';
import { Router } from 'express';
import type { Container } from '../container.js';
import { noStore } from '../lib/http.js';
import { requireOwner } from '../middlewares/require-owner.js';
import { validate } from '../middlewares/validate.js';

/** POST /api/studio/ask (owner): F13 Ask your AI. */
export function createAskRoutes(container: Container): Router {
  const router = Router();
  const { auth, repos } = container;
  router.use(
    noStore(),
    requireOwner({ auth, spaces: repos.spaces, memberships: repos.memberships }),
  );
  router.post('/', validate({ body: askAiRequestSchema }), container.controllers.ask.ask);
  return router;
}
