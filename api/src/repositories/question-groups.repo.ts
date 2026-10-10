import type { Db } from '../db/client.js';

/** question_groups and the pitches in them (F32 Answer Once). Stub: F01 adds the queries. */
export function createQuestionGroupsRepo(_db: Db) {
  return {};
}

export type QuestionGroupsRepo = ReturnType<typeof createQuestionGroupsRepo>;
