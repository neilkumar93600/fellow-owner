import type { Request, Response } from 'express';
import type { CoreDeps } from '../container.js';
import { withJobLock } from '../lib/job-lock.js';
import type { Jobs } from '../workers/tick.js';

export type AdminControllerDeps = Pick<CoreDeps, 'db' | 'logger'> & { jobs: Jobs };

/** /api/admin/* (ADMIN_EMAILS, checked by requireAdmin). */
export function createAdminController(deps: AdminControllerDeps) {
  return {
    /** POST /api/admin/demo-reset -> 202; the reset runs in the background under its job lock. */
    async demoReset(_req: Request, res: Response): Promise<void> {
      void withJobLock(deps.db, 'demo_reset', () => deps.jobs.demo_reset()).then(
        (lock) => {
          if (!lock.ran) deps.logger.info('demo reset skipped: already running');
        },
        (err) => deps.logger.error({ err }, 'demo reset failed'),
      );
      res.status(202).json({ accepted: true });
    },
  };
}

export type AdminController = ReturnType<typeof createAdminController>;
