import { handleParamsSchema, updateMediaKitSchema } from '@fellow-owners/shared';
import type { Request, Response } from 'express';
import { setPublicCache } from '../lib/http.js';
import { userIdOf } from '../middlewares/require-session.js';
import { bodyOf, paramsOf } from '../middlewares/validate.js';
import type { AccessService, OwnerContext } from '../services/access.service.js';
import type { MediaKitService } from '../services/media-kit.service.js';

/** F6 Media kit: the public read and the owner's preview and settings. */
export function createMediaKitController(deps: {
  access: AccessService;
  mediaKit: MediaKitService;
}) {
  const ownerOf = (req: Request): OwnerContext =>
    deps.access.assertOwner({
      userId: userIdOf(req),
      space: req.space,
      membership: req.membership,
    });

  return {
    /** GET /api/spaces/:handle/media-kit -> MediaKit (public, CDN-cached 60 s) */
    async publicKit(req: Request, res: Response): Promise<void> {
      const kit = await deps.mediaKit.publicKit(paramsOf(req, handleParamsSchema).handle);
      setPublicCache(res).json(kit);
    },

    /** GET /api/spaces/:handle/media-kit/preview -> MediaKit (owner) */
    async preview(req: Request, res: Response): Promise<void> {
      res.json(await deps.mediaKit.preview(ownerOf(req)));
    },

    /** PATCH /api/spaces/:handle/media-kit -> MediaKitSettings (owner) */
    async updateSettings(req: Request, res: Response): Promise<void> {
      res.json(await deps.mediaKit.updateSettings(ownerOf(req), bodyOf(req, updateMediaKitSchema)));
    },
  };
}

export type MediaKitController = ReturnType<typeof createMediaKitController>;
