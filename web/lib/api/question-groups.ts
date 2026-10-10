import type {
  AnswerQuestionGroupInput,
  QuestionGroup,
  QuestionGroupsPage,
  RedraftResult,
} from '@fellow-owners/shared';
import { apiFetch } from '@/lib/fetcher';

// Typed client for /api/studio/question-groups (creator only): Answer Once (F32).

const base = '/api/studio/question-groups';
const at = (segment: string) => encodeURIComponent(segment);

/** GET / : open groups first (newest question first), then answered; dismissed ones are hidden. */
export function listQuestionGroups(signal?: AbortSignal): Promise<QuestionGroupsPage> {
  return apiFetch<QuestionGroupsPage>(base, { signal });
}

/** POST /:id/answer : replies to every asker once; 409 when the group is no longer open. */
export function answerQuestionGroup(
  id: string,
  input: AnswerQuestionGroupInput,
): Promise<QuestionGroup> {
  return apiFetch<QuestionGroup>(`${base}/${at(id)}/answer`, {
    method: 'POST',
    json: input,
  });
}

/** POST /:id/redraft : a new AI draft; 429 after 5 a day per group. */
export function redraftQuestionGroup(id: string): Promise<RedraftResult> {
  return apiFetch<RedraftResult>(`${base}/${at(id)}/redraft`, {
    method: 'POST',
  });
}

/** POST /:id/dismiss */
export function dismissQuestionGroup(id: string): Promise<QuestionGroup> {
  return apiFetch<QuestionGroup>(`${base}/${at(id)}/dismiss`, {
    method: 'POST',
  });
}

/** DELETE /:id/askers/:pitchId : takes one pitch out of the group for good; 404 when it is not in it. */
export function removeQuestionGroupAsker(id: string, pitchId: string): Promise<QuestionGroup> {
  return apiFetch<QuestionGroup>(`${base}/${at(id)}/askers/${at(pitchId)}`, {
    method: 'DELETE',
  });
}
