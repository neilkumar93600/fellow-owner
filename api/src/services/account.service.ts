import type { AccountExport } from '@fellow-owners/shared';
import type { CoreDeps } from '../container.js';
import { notImplemented } from '../lib/errors.js';

export type AccountServiceDeps = Pick<CoreDeps, 'db' | 'repos' | 'auth' | 'logger'>;

/** Account export and deletion (Better Auth deleteUser hooks). Stub: F08 builds it. */
export function createAccountService(_deps: AccountServiceDeps) {
  return {
    /** GET /api/me/export: only the caller's own rows. */
    async exportAccount(_userId: string): Promise<AccountExport> {
      throw notImplemented('Data export');
    },
    /** Better Auth beforeDelete: owner -> space deleted; member -> memberships removed. */
    async beforeDelete(_userId: string): Promise<void> {
      throw notImplemented('Account deletion');
    },
  };
}

export type AccountService = ReturnType<typeof createAccountService>;
