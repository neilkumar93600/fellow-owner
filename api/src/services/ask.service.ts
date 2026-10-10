import type { AskAiRequestInput, AskAnswer } from '@fellow-owners/shared';
import type { CoreDeps } from '../container.js';
import { notImplemented } from '../lib/errors.js';

export type AskServiceDeps = Pick<CoreDeps, 'repos' | 'ai' | 'logger'>;

/** F13 Ask your AI: answers from the nearest posts and pitches. Stub: F05 builds it. */
export function createAskService(_deps: AskServiceDeps) {
  return {
    async ask(_spaceId: string, _userId: string, _input: AskAiRequestInput): Promise<AskAnswer> {
      throw notImplemented('Ask your AI');
    },
  };
}

export type AskService = ReturnType<typeof createAskService>;
