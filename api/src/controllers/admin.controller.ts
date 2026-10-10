import type { Request, Response } from 'express';
import type { CoreDeps } from '../container.js';
import { notImplemented } from '../lib/errors.js';
import type { Jobs } from '../workers/tick.js';

export type AdminControllerDeps = Pick<CoreDeps, 'db' | 'logger'> & { jobs: Jobs };

/** /api/admin/* (ADMIN_EMAILS). Stub: F11 adds requireAdmin and the demo reset. */
export function createAdminController(_deps: AdminControllerDeps) {
  return {
    /** POST /api/admin/demo-reset -> 202, the reset runs under withJobLock('demo_reset'). */
    async demoReset(_req: Request, _res: Response): Promise<void> {
      throw notImplemented('Admin demo reset');
    },
  };
}

export type AdminController = ReturnType<typeof createAdminController>;
