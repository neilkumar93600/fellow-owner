import type { AccountExport } from '@fellow-owners/shared';
import type { CoreDeps } from '../container.js';
import { notFound } from '../lib/errors.js';

/** No `auth`: Better Auth builds this service itself (auth/index.ts) for its delete hook. */
export type AccountServiceDeps = Pick<CoreDeps, 'db' | 'repos' | 'logger' | 'storage'>;

/** Account export and the deletion hook Better Auth runs before it deletes the user. */
export function createAccountService(deps: AccountServiceDeps) {
  const { db, repos, storage } = deps;
  const log = deps.logger.child({ module: 'account' });

  /**
   * Best effort: the user's uploads (avatar, member_avatar) and their spaces' covers. A failure
   * is logged and never blocks the deletion; the rows pointing at them are already gone.
   */
  async function deleteImages(userId: string, spaceIds: string[]): Promise<void> {
    if (!storage.enabled) return;
    const prefixes = [
      `avatar/${userId}/`,
      `member_avatar/${userId}/`,
      ...spaceIds.flatMap((id) => [`space_cover/${id}/`, `community_cover/${id}/`]),
    ];
    for (const prefix of prefixes) {
      try {
        const deleted = await storage.deletePrefix(prefix);
        if (deleted > 0) log.info({ userId, prefix, deleted }, 'account images deleted');
      } catch (err) {
        log.warn({ err, userId, prefix }, 'account images not deleted');
      }
    }
  }

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
     * "Former member". After commit the user's and their spaces' bucket images go (best effort).
     * Better Auth then deletes the user, its sessions and accounts.
     *
     * Idempotent: every step works on what is still there, so when Better Auth's own delete fails
     * after this hook, the retry (a new code) runs it again and finishes cleanly.
     */
    async beforeDelete(userId: string): Promise<void> {
      const spaceIds = await db.transaction(async (tx) => {
        const owned = await repos.account.deleteOwnedSpaces(userId, tx);
        const mine = await repos.account.membershipsOf(userId, tx);
        for (const m of mine) {
          if (!m.removedAt) await repos.memberships.remove(m.spaceId, m.id, tx);
        }
        await repos.account.deleteMemberships(userId, tx);
        log.info(
          { userId, spaces: owned.length, memberships: mine.length },
          'account data removed before delete',
        );
        return owned;
      });
      await deleteImages(userId, spaceIds);
    },
  };
}

export type AccountService = ReturnType<typeof createAccountService>;
