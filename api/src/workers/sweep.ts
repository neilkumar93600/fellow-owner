import { LIMITS } from '@fellow-owners/shared';
import type { BackgroundRunner, ItemRef, SweepResult } from '../ai/types.js';
import type { Logger } from '../lib/logger.js';
import type { Repos } from '../repositories/index.js';

export interface SweepDeps {
  repos: Pick<Repos, 'posts' | 'pitches'>;
  background: BackgroundRunner;
  logger: Logger;
}

/**
 * Sweep (02-trd data flow 2): claims up to LIMITS.sweep.claimMax (25) pending items of the space
 * (FOR UPDATE SKIP LOCKED + lease, split between pitches and posts so neither starves), returns
 * at once, and analyzes them LIMITS.sweep.batchSize (5) at a time in the background.
 * Safe to call repeatedly: claimed items are skipped by other sweeps until their lease expires.
 * When the AI is paused (budget used up or disabled), the rest of the batch is released at once
 * instead of being tried one by one.
 */
export async function sweepSpace(
  deps: SweepDeps,
  spaceId: string,
  /** Analyzes one claimed item; resolves with its outcome (analyze-item.ts AnalyzeOutcome). */
  analyzeClaimed: (ref: ItemRef) => Promise<unknown>,
): Promise<SweepResult> {
  const { claimMax, batchSize } = LIMITS.sweep;
  const { posts, pitches } = deps.repos;
  const pitchIds = await pitches.claimPending(spaceId, Math.ceil(claimMax / 2));
  const postIds = await posts.claimPending(spaceId, claimMax - pitchIds.length);
  const extraPitchIds =
    pitchIds.length + postIds.length < claimMax
      ? await pitches.claimPending(spaceId, claimMax - pitchIds.length - postIds.length)
      : [];

  const refs: ItemRef[] = [
    ...[...pitchIds, ...extraPitchIds].map((id) => ({ kind: 'inbound' as const, id })),
    ...postIds.map((id) => ({ kind: 'post' as const, id })),
  ];
  const remaining =
    (await posts.remainingPending(spaceId)) + (await pitches.remainingPending(spaceId));

  if (refs.length > 0) {
    deps.background.run(`sweep:${spaceId}`, async () => {
      const started = Date.now();
      const tally: Record<string, number> = {};
      for (let i = 0; i < refs.length; i += batchSize) {
        const batch = refs.slice(i, i + batchSize);
        const outcomes = await Promise.all(batch.map((ref) => analyzeClaimed(ref)));
        for (const outcome of outcomes) {
          const key = typeof outcome === 'string' ? outcome : 'unknown';
          tally[key] = (tally[key] ?? 0) + 1;
        }
        if (outcomes.includes('postponed')) {
          const rest = refs.slice(i + batchSize);
          await Promise.all(
            rest.map((ref) =>
              (ref.kind === 'post' ? posts : pitches).releaseClaim(ref.id).catch(() => undefined),
            ),
          );
          tally.released = rest.length;
          break;
        }
      }
      deps.logger.info(
        { spaceId, claimed: refs.length, ms: Date.now() - started, ...tally },
        'sweep done',
      );
    });
  }
  deps.logger.debug({ spaceId, claimed: refs.length, remaining }, 'sweep started');
  return { claimed: refs.length, remaining };
}
