import type { CoreDeps } from '../container.js';
import { notImplemented } from '../lib/errors.js';

export type QuestionGrouperDeps = Pick<CoreDeps, 'db' | 'repos' | 'ai' | 'logger'>;

export interface GroupSpaceResult {
  /** New groups seeded this run. */
  created: number;
  /** Pitches that joined an existing group. */
  joined: number;
}

/** F32 Answer Once grouping job (tick `group_questions`). Stub: F01 builds it. */
export function createQuestionGrouper(_deps: QuestionGrouperDeps) {
  return {
    async groupSpace(_spaceId: string): Promise<GroupSpaceResult> {
      throw notImplemented('Question grouping');
    },
    /** Spaces with new pitches since the last run, or groups missing a question/draft. */
    async groupDueSpaces(_now: Date): Promise<number> {
      throw notImplemented('Question grouping');
    },
  };
}

export type QuestionGrouper = ReturnType<typeof createQuestionGrouper>;
