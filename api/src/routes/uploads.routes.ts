import { presignUploadSchema } from '@fellow-owners/shared';
import { Router } from 'express';
import type { Container } from '../container.js';
import { noStore } from '../lib/http.js';
import { requireSession } from '../middlewares/require-session.js';
import { validate } from '../middlewares/validate.js';

/** GET /api/media/*key (public): 302 to a presigned bucket URL. */
export function createMediaRoutes(container: Container): Router {
  const router = Router();
  router.get('/*key', container.controllers.uploads.media);
  return router;
}

/** POST /api/uploads/presign (session). */
export function createUploadsRoutes(container: Container): Router {
  const router = Router();
  router.use(noStore(), requireSession(container.auth));
  router.post(
    '/presign',
    validate({ body: presignUploadSchema }),
    container.controllers.uploads.presign,
  );
  return router;
}
