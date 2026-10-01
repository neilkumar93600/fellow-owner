import type { SignalKind, SignalState } from '@fellow-owners/shared';
import { forbidden } from '../lib/errors.js';
import type { Repos } from '../repositories/index.js';
import type { AccessService } from './access.service.js';

/**
 * "I'd use this" / "I'd help build" (05 §6-7): members only, never on their own post, idempotent.
 * use_count / build_count change in the same transaction as the signal row (signals.repo).
 */
export function createSignalsService(deps: { repos: Repos; access: AccessService }) {
  const { repos, access } = deps;

  return {
    /** PUT /api/posts/:id/signals/:kind */
    async add(postId: string, userId: string, kind: SignalKind): Promise<SignalState> {
      const ctx = await access.requirePostAccess(postId, userId);
      if (ctx.post.authorMembershipId === ctx.membership.id) {
        throw forbidden("You can't signal your own post");
      }
      const { useCount, buildCount, viewerSignals } = await repos.signals.add(
        ctx.post.id,
        ctx.membership.id,
        kind,
      );
      return { useCount, buildCount, viewerSignals };
    },

    /** DELETE /api/posts/:id/signals/:kind (idempotent). */
    async remove(postId: string, userId: string, kind: SignalKind): Promise<SignalState> {
      const ctx = await access.requirePostAccess(postId, userId);
      const { useCount, buildCount, viewerSignals } = await repos.signals.remove(
        ctx.post.id,
        ctx.membership.id,
        kind,
      );
      return { useCount, buildCount, viewerSignals };
    },
  };
}

export type SignalsService = ReturnType<typeof createSignalsService>;
