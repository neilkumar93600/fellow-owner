import {
  instagramCallbackQuerySchema,
  instagramVerifyQuerySchema,
  instagramWebhookSchema,
} from '@fellow-owners/shared';
import type { Request, Response } from 'express';
import type { Env } from '../config/env.js';
import { userIdOf } from '../middlewares/require-session.js';
import { bodyOf, queryOf } from '../middlewares/validate.js';
import type { AccessService, OwnerContext } from '../services/access.service.js';
import type { InstagramService } from '../services/instagram.service.js';

/** F5 Instagram DM switch: connect / callback / disconnect (owner) and Meta's webhook. */
export function createInstagramController(deps: {
  env: Env;
  access: AccessService;
  instagram: InstagramService;
}) {
  const ownerOf = (req: Request): OwnerContext =>
    deps.access.assertOwner({
      userId: userIdOf(req),
      space: req.space,
      membership: req.membership,
    });

  return {
    /** POST /api/spaces/:handle/instagram/connect -> InstagramConnectStart */
    async connectStart(req: Request, res: Response): Promise<void> {
      res.json(await deps.instagram.connectStart(ownerOf(req)));
    },

    /** GET /api/instagram/callback -> 302 to the web (Settings, Brand deals tab). */
    async callback(req: Request, res: Response): Promise<void> {
      const path = await deps.instagram.callback(
        queryOf(req, instagramCallbackQuerySchema),
        req.session?.user.id ?? null,
      );
      res.redirect(302, `${deps.env.WEB_ORIGIN}${path}`);
    },

    /** DELETE /api/spaces/:handle/instagram -> 204 */
    async disconnect(req: Request, res: Response): Promise<void> {
      await deps.instagram.disconnect(ownerOf(req));
      res.status(204).end();
    },

    /** GET /api/webhooks/instagram -> the challenge, as plain text */
    verify(req: Request, res: Response): void {
      const challenge = deps.instagram.verifyWebhook(queryOf(req, instagramVerifyQuerySchema));
      res.type('text/plain').send(challenge);
    },

    /** POST /api/webhooks/instagram (signed) -> 200 (Meta retries anything else) */
    async receive(req: Request, res: Response): Promise<void> {
      await deps.instagram.receiveWebhook(bodyOf(req, instagramWebhookSchema));
      res.status(200).json({ ok: true });
    },
  };
}

export type InstagramController = ReturnType<typeof createInstagramController>;
