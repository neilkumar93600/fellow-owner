import type { CoachRequestInput, CoachResult } from '@fellow-owners/shared';
import type { CoreDeps } from '../container.js';
import { notImplemented } from '../lib/errors.js';

export type CoachServiceDeps = Pick<CoreDeps, 'repos' | 'ai' | 'logger'>;

/** F30 Idea Coach: clarity checks on a pitch or post draft. Stub: F02 builds it. */
export function createCoachService(_deps: CoachServiceDeps) {
  return {
    async check(_handle: string, _userId: string, _input: CoachRequestInput): Promise<CoachResult> {
      throw notImplemented('Idea Coach');
    },
  };
}

export type CoachService = ReturnType<typeof createCoachService>;
