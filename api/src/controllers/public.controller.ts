import {
  handleAvailableQuerySchema,
  handleParamsSchema,
  shortLinkParamsSchema,
  shortLinkQuerySchema,
  showcaseParamsSchema,
} from '@fellow-owners/shared';
import type { Request, Response } from 'express';
import { rateLimited } from '../lib/errors.js';
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

/** GET /api/handle-available checks one client (IP) may make per minute. */
export const HANDLE_AVAILABLE_PER_MINUTE = 30;
const MINUTE_MS = 60_000;

/**
 * Public, signed-out endpoints: the bio page and the showcase (CDN-cached, so they never read
 * the session or set cookies), the handle check for /create-account, and the /r/:code short link
 * redirect.
 */
export function createPublicController(deps: PublicControllerDeps) {
  // ponytail: per-process fixed window, so each replica counts on its own; move it to Redis
  // (like Better Auth's counters in auth/index.ts) if one IP spread over replicas matters.
  const checks = new Map<string, { count: number; resetAt: number }>();

  function allowCheck(ip: string): boolean {
    const now = Date.now();
    if (checks.size > 10_000) {
      for (const [key, window] of checks) if (window.resetAt <= now) checks.delete(key);
    }
    const window = checks.get(ip);
    if (!window || window.resetAt <= now) {
      checks.set(ip, { count: 1, resetAt: now + MINUTE_MS });
      return true;
    }
    window.count += 1;
    return window.count <= HANDLE_AVAILABLE_PER_MINUTE;
  }

  return {
    /**
     * GET /api/handle-available?h= -> HandleCheck (never cached, no session read). Free only when
     * no space has it as its handle and no user as their username. 429 rate_limited after
     * HANDLE_AVAILABLE_PER_MINUTE checks per minute from one IP.
     */
    async handleAvailable(req: Request, res: Response): Promise<void> {
      res.set('Cache-Control', PRIVATE_NO_STORE);
      if (!allowCheck(req.ip ?? 'unknown')) {
        throw rateLimited('Too many handle checks. Try again in a minute.');
      }
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
