import type { CoreDeps } from '../container.js';
import { notImplemented } from '../lib/errors.js';
import type { ChallengesService } from '../services/challenges.service.js';

export type ChallengeCloserDeps = Pick<CoreDeps, 'db' | 'repos' | 'ai' | 'logger'> & {
  challenges: ChallengesService;
};

/** Closes overdue challenges with an AI summary (tick `close_challenges`). Stub: F04. */
export function createChallengeCloser(_deps: ChallengeCloserDeps) {
  return {
    /** Resolves with the challenges closed. */
    async closeOverdue(_now: Date): Promise<number> {
      throw notImplemented('Challenge close');
    },
  };
}

export type ChallengeCloser = ReturnType<typeof createChallengeCloser>;
