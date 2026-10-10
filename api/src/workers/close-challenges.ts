import type { CoreDeps } from '../container.js';
import type { ChallengesService } from '../services/challenges.service.js';

export type ChallengeCloserDeps = Pick<CoreDeps, 'repos' | 'logger'> & {
  challenges: ChallengesService;
};

/** Overdue challenges closed per run; the next hourly run takes the rest. */
const CLOSE_BATCH = 100;

/**
 * Closes overdue challenges in every space with the same path as the creator's Close button
 * (shortlist + notifications) plus an AI recap (tick `close_challenges`). Reads never close.
 */
export function createChallengeCloser(deps: ChallengeCloserDeps) {
  const log = deps.logger.child({ module: 'close-challenges' });
  return {
    /** Resolves with the challenges closed. One failed close never stops the others. */
    async closeOverdue(now: Date): Promise<number> {
      const due = await deps.repos.asks.overdue(now, CLOSE_BATCH);
      let closed = 0;
      for (const { ask, space } of due) {
        try {
          if (await deps.challenges.closeWithSummary(space, ask.id)) closed += 1;
        } catch (err) {
          log.warn({ err, askId: ask.id, spaceId: space.id }, 'overdue challenge close failed');
        }
      }
      if (due.length > 0) log.info({ due: due.length, closed }, 'overdue challenges closed');
      return closed;
    },
  };
}

export type ChallengeCloser = ReturnType<typeof createChallengeCloser>;
