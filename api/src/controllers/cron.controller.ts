import type { Request, Response } from 'express';
import type { CoreDeps } from '../container.js';
import { resetDemo } from '../workers/demo-reset.js';
import { purgeExpired } from '../workers/purge.js';
import { refreshFollowers } from '../workers/refresh-followers.js';

/**
 * /api/cron/*: the daily jobs from vercel.json. The Bearer CRON_SECRET check is the router's
 * (middlewares/cron-auth.ts), so a handler here already knows the caller is the scheduler.
 *
 * Both run to completion before responding rather than in the background: Vercel Cron reads the
 * status code to decide whether the run succeeded, and a response sent first would always say OK.
 */
export function createCronController(deps: CoreDeps) {
  return {
    /** GET|POST /api/cron/demo-reset -> { ok, deleted, seeded } */
    async demoReset(_req: Request, res: Response): Promise<void> {
      const result = await resetDemo(deps);
      res.json({ ok: true, ...result });
    },

    /** GET|POST /api/cron/purge -> { ok, ...rows deleted per retention rule } */
    async purge(_req: Request, res: Response): Promise<void> {
      const result = await purgeExpired(deps);
      res.json({ ok: true, ...result });
    },

    /** GET|POST /api/cron/refresh-followers -> { ok, checked, updated, kept } */
    async refreshFollowers(_req: Request, res: Response): Promise<void> {
      const result = await refreshFollowers(deps);
      res.json({ ok: true, ...result });
    },
  };
}

export type CronController = ReturnType<typeof createCronController>;
