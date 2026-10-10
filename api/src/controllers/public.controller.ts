import {
  handleAvailableQuerySchema,
  handleParamsSchema,
  shortLinkParamsSchema,
  shortLinkQuerySchema,
  showcaseParamsSchema,
} from '@fellow-owners/shared';
import type { Request, Response } from 'express';
import { PRIVATE_NO_STORE, setPublicCache } from '../lib/http.js';
import { paramsOf, queryOf } from '../middlewares/validate.js';
import type { ClicksService } from '../services/clicks.service.js';
import type { PromotionsService } from '../services/promotions.service.js';
import type { SpacesService } from '../services/spaces.service.js';

export interface PublicControllerDeps {
  spaces: SpacesService;
  promotions: PromotionsService;
  clicks: ClicksService;
}

/** GET /api/handle-available checks one client (IP) may make per minute (public.routes.ts). */
export const HANDLE_AVAILABLE_PER_MINUTE = 30;

/**
 * Public, signed-out endpoints: the bio page and the showcase (CDN-cached, so they never read
 * the session or set cookies), the handle check for /create-account, and the /r/:code short link
 * redirect.
 */
export function createPublicController(deps: PublicControllerDeps) {
  return {
    /**
     * GET /api/handle-available?h= -> HandleCheck (never cached, no session read). Free only when
     * no space has it as its handle and no user as their username. 429 rate_limited after
     * HANDLE_AVAILABLE_PER_MINUTE checks per minute from one IP (route limiter).
     */
    async handleAvailable(req: Request, res: Response): Promise<void> {
      res.set('Cache-Control', PRIVATE_NO_STORE);
      const { h } = queryOf(req, handleAvailableQuerySchema);
      res.json(await deps.spaces.checkHandle(h));
    },

    /** GET /api/spaces/:handle -> SpacePage */
    async spacePage(req: Request, res: Response): Promise<void> {
      const { handle } = paramsOf(req, handleParamsSchema);
      const page = await deps.spaces.publicPage(handle);
      setPublicCache(res).json(page);
    },

    /** GET /api/spaces/:handle/showcase/:slug -> Showcase */
    async showcase(req: Request, res: Response): Promise<void> {
      const { handle, slug } = paramsOf(req, showcaseParamsSchema);
      const showcase = await deps.promotions.showcase(handle, slug);
      setPublicCache(res).json(showcase);
    },

    /**
     * GET /r/:code?p= -> 302 to the showcase (click recorded for live promotions). A malformed
     * code is treated like an unknown one (redirect home), never a JSON error: people open these
     * links in a browser.
     */
    async shortLink(req: Request, res: Response): Promise<void> {
      const params = shortLinkParamsSchema.safeParse(req.params);
      const { p } = queryOf(req, shortLinkQuerySchema);
      const location = await deps.clicks.resolve({
        code: params.success ? params.data.code : '',
        platform: p,
        ip: req.ip,
        userAgent: req.get('user-agent'),
        referer: req.get('referer'),
      });
      res.set('Cache-Control', PRIVATE_NO_STORE).redirect(302, location);
    },
  };
}

export type PublicController = ReturnType<typeof createPublicController>;
