import type { Request, Response } from 'express';
import { userIdOf } from '../middlewares/require-session.js';
import type { AccountService } from '../services/account.service.js';

/** /api/me/* (session): account export. Deletion runs through Better Auth's deleteUser. */
export function createAccountController(deps: { account: AccountService }) {
  return {
    /** GET /api/me/export -> AccountExport as a JSON download */
    async exportAccount(req: Request, res: Response): Promise<void> {
      const data = await deps.account.exportAccount(userIdOf(req));
      res.set('Content-Disposition', 'attachment; filename="fellow-owners-export.json"');
      res.json(data);
    },
  };
}

export type AccountController = ReturnType<typeof createAccountController>;
