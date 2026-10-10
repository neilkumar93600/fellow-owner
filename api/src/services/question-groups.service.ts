import type {
  AnswerQuestionGroupInput,
  QuestionGroup,
  QuestionGroupsPage,
  RedraftResult,
} from '@fellow-owners/shared';
import type { CoreDeps } from '../container.js';
import { notImplemented } from '../lib/errors.js';

export type QuestionGroupsServiceDeps = Pick<CoreDeps, 'db' | 'repos' | 'ai' | 'logger'>;

/** F32 Answer Once: the owner's question groups. Stub: F01 builds it. */
export function createQuestionGroupsService(_deps: QuestionGroupsServiceDeps) {
  return {
    /** Open groups first (last_asked_at desc), then answered; dismissed hidden. */
    async list(_spaceId: string): Promise<QuestionGroupsPage> {
      throw notImplemented('Answer Once');
    },
    /** Replies to every asker once; 409 when the group is not open. */
    async answer(
      _spaceId: string,
      _userId: string,
      _groupId: string,
      _input: AnswerQuestionGroupInput,
    ): Promise<QuestionGroup> {
      throw notImplemented('Answer Once');
    },
    /** 429 after LIMITS.answerOnce.redraftsPerDay per group. */
    async redraft(_spaceId: string, _groupId: string): Promise<RedraftResult> {
      throw notImplemented('Answer Once');
    },
    async dismiss(_spaceId: string, _groupId: string): Promise<QuestionGroup> {
      throw notImplemented('Answer Once');
    },
    /** 404 when the pitch is not in the group. */
    async removeAsker(
      _spaceId: string,
      _groupId: string,
      _pitchId: string,
    ): Promise<QuestionGroup> {
      throw notImplemented('Answer Once');
    },
  };
}

export type QuestionGroupsService = ReturnType<typeof createQuestionGroupsService>;
