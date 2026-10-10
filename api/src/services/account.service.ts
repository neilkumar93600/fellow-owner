import type { AccountExport } from '@fellow-owners/shared';
import type { CoreDeps } from '../container.js';
import { notFound } from '../lib/errors.js';

/** No `auth`: Better Auth builds this service itself (auth/index.ts) for its delete hook. */
export type AccountServiceDeps = Pick<CoreDeps, 'db' | 'repos' | 'logger'>;

/** Account export and the deletion hook Better Auth runs before it deletes the user. */
export function createAccountService(deps: AccountServiceDeps) {
  const { db, repos } = deps;
  const log = deps.logger.child({ module: 'account' });

  return {
    /** GET /api/me/export: only the caller's own rows. */
    async exportAccount(userId: string): Promise<AccountExport> {
      const rows = await repos.account.exportRows(userId);
      if (!rows) throw notFound('Account');
      return {
        exportedAt: new Date().toISOString(),
        ...rows,
        user: {
          ...rows.user,
          createdAt: rows.user.createdAt.toISOString(),
        },
      };
    },

    /**
     * Better Auth `user.deleteUser.beforeDelete`, one transaction: the spaces the user owns go
     * first (everything in them cascades); then each active membership elsewhere leaves its
     * communities through the normal removal path (member_count kept right), and the memberships
     * are deleted with their counters recomputed (accounts repo). Posts and comments stay as
     * "Former member". Better Auth then deletes the user, its sessions and accounts.
     */
    async beforeDelete(userId: string): Promise<void> {
      await db.transaction(async (tx) => {
        const spaces = await repos.account.deleteOwnedSpaces(userId, tx);
        const mine = await repos.account.membershipsOf(userId, tx);
        for (const m of mine) {
          if (!m.removedAt) await repos.memberships.remove(m.spaceId, m.id, tx);
        }
        await repos.account.deleteMemberships(userId, tx);
        log.info(
          { userId, spaces, memberships: mine.length },
          'account data removed before delete',
        );
      });
    },
  };
}

export type AccountService = ReturnType<typeof createAccountService>;
