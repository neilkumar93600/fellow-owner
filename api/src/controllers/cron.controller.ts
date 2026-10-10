import type { Request, Response } from 'express';
import type { CoreDeps } from '../container.js';
import { queryOf } from '../middlewares/validate.js';
import { resetDemo } from '../workers/demo-reset.js';
import { purgeExpired } from '../workers/purge.js';
import { refreshFollowers } from '../workers/refresh-followers.js';
import { type Jobs, recentRuns, startTick, tickQuerySchema } from '../workers/tick.js';

/**
 * /api/cron/*. The Bearer CRON_SECRET check is the router's (middlewares/cron-auth.ts), so a
 * handler here already knows the caller is the scheduler.
 *
 * The tick (Railway cron, hourly) answers 202 at once and runs its jobs in the background; the
 * per-job manual triggers below run to completion before responding, so their status code says
 * whether the run succeeded.
 */
export function createCronController(deps: CoreDeps & { jobs: Jobs }) {
  return {
    /** GET|POST /api/cron/tick[?job=<name>] -> 202 { jobs } */
    async tick(req: Request, res: Response): Promise<void> {
      const { job } = queryOf(req, tickQuerySchema);
      const jobs = await startTick(deps, job ? { only: job } : {});
      res.status(202).json({ jobs });
    },

    /** GET /api/cron/status -> { runs } (last 50 job runs, newest first) */
    async status(_req: Request, res: Response): Promise<void> {
      res.json({ runs: await recentRuns(deps) });
    },

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
