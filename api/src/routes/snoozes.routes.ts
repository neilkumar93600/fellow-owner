import { checklistStepSchema, snoozeParamsSchema, snoozeSchema } from '@fellow-owners/shared';
import { Router } from 'express';
import type { Container } from '../container.js';
import { noStore } from '../lib/http.js';
import { requireOwner } from '../middlewares/require-owner.js';
import { validate } from '../middlewares/validate.js';

function ownerOnly(container: Container) {
  const { auth, repos } = container;
  return requireOwner({ auth, spaces: repos.spaces, memberships: repos.memberships });
}

/** /api/studio/snoozes (owner): POST / and DELETE /:refType/:refId. */
export function createSnoozesRoutes(container: Container): Router {
  const router = Router();
  const controller = container.controllers.snoozes;
  router.use(noStore(), ownerOnly(container));
  router.post('/', validate({ body: snoozeSchema }), controller.snooze);
  router.delete('/:refType/:refId', validate({ params: snoozeParamsSchema }), controller.unsnooze);
  return router;
}

/** POST /api/studio/checklist (owner). */
export function createChecklistRoutes(container: Container): Router {
  const router = Router();
  router.use(noStore(), ownerOnly(container));
  router.post(
    '/',
    validate({ body: checklistStepSchema }),
    container.controllers.snoozes.markChecklistStep,
  );
  return router;
}
