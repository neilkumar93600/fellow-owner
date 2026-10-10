import { presignUploadSchema } from '@fellow-owners/shared';
import type { Request, Response } from 'express';
import { userIdOf } from '../middlewares/require-session.js';
import { bodyOf } from '../middlewares/validate.js';
import type { UploadsService } from '../services/uploads.service.js';

/** POST /api/uploads/presign (session) and GET /api/media/*key (public). */
export function createUploadsController(deps: { uploads: UploadsService }) {
  return {
    /** -> PresignedUpload */
    async presign(req: Request, res: Response): Promise<void> {
      res.json(await deps.uploads.presign(userIdOf(req), bodyOf(req, presignUploadSchema)));
    },
    /** -> 302 to a short-lived presigned GET */
    async media(req: Request, res: Response): Promise<void> {
      // Express 5 named wildcards (`/*key`) arrive as the list of path segments.
      const raw: unknown = req.params.key;
      const key = Array.isArray(raw) ? raw.join('/') : String(raw ?? '');
      const url = await deps.uploads.mediaUrl(key);
      res.set('Cache-Control', 'public, max-age=3000');
      res.redirect(302, url);
    },
  };
}

export type UploadsController = ReturnType<typeof createUploadsController>;
