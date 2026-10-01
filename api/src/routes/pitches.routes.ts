import { idParamsSchema, withdrawPitchSchema } from '@fellow-owners/shared';
import { Router } from 'express';
import type { Container } from '../container.js';
import { noStore } from '../lib/http.js';
import { requireSession } from '../middlewares/require-session.js';
import { validate } from '../middlewares/validate.js';

/** /api/pitches/:id: the sender withdraws a pitch (only while `new`). */
export function createPitchesRoutes(container: Container): Router {
  const router = Router();
  const controller = container.controllers.pitches;

  router.use(noStore());
  router.patch(
    '/:id',
    requireSession(container.auth),
    validate({ params: idParamsSchema, body: withdrawPitchSchema }),
    controller.withdraw,
  );
  return router;
}
