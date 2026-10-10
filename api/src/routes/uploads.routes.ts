import { presignUploadSchema } from '@fellow-owners/shared';
import { Router } from 'express';
import type { Container } from '../container.js';
import { noStore } from '../lib/http.js';
import { createRateLimit } from '../middlewares/rate-limit.js';
import { requireSession, userIdOf } from '../middlewares/require-session.js';
import { validate } from '../middlewares/validate.js';

/** Media reads one IP may make per minute (generous: a page shows many images). */
export const MEDIA_READS_PER_MINUTE = 600;
/** Presigned uploads per user: objects are never cleaned up, so this bounds bucket growth. */
export const PRESIGNS_PER_USER = { hour: 30, day: 100 } as const;

/** GET /api/media/*key (public, per-IP limit): 302 to a presigned bucket URL. */
export function createMediaRoutes(container: Container): Router {
  const router = Router();
  router.get(
    '/*key',
    createRateLimit({
      name: 'media',
      windowSeconds: 60,
      max: MEDIA_READS_PER_MINUTE,
      key: (req) => req.ip ?? 'unknown',
    }),
    container.controllers.uploads.media,
  );
  return router;
}

/** POST /api/uploads/presign (session; 30 an hour and 100 a day per user). */
export function createUploadsRoutes(container: Container): Router {
  const router = Router();
  const perUser = (name: string, windowSeconds: number, max: number) =>
    createRateLimit({ name, windowSeconds, max, key: userIdOf, internalKey: null });
  router.use(noStore(), requireSession(container.auth));
  router.post(
    '/presign',
    perUser('presign-hour', 3600, PRESIGNS_PER_USER.hour),
    perUser('presign-day', 86_400, PRESIGNS_PER_USER.day),
    validate({ body: presignUploadSchema }),
    container.controllers.uploads.presign,
  );
  return router;
}
