import { LIMITS } from '@fellow-owners/shared';
import type { QuestionGroupInput, QuestionGroupOutput } from '../types.js';

const one = (text: string) => text.replace(/\s+/g, ' ').trim();

function cut(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}

/**
 * Deterministic question naming + draft: the first quote becomes the question; the draft is one
 * of two fixed replies, and a redraft (previousDraft set) always returns the other one.
 */
export function fakeQuestionGroup(input: QuestionGroupInput): QuestionGroupOutput {
  const first = one(input.quotes[0] ?? '');
  if (!first) return { isQuestion: false, question: '', draft: '' };
  const name = one(input.creatorName).split(' ')[0] || 'me';
  const count = input.quotes.length;
  const drafts = [
    `So many of you asked about this, thank you! Short answer: I'm putting it all in one place soon, so watch this space. - ${name}`,
    `You asked, ${count} times over! I'll answer this properly in my next update, with everything I've learned. - ${name}`,
  ] as const;
  const draft = input.previousDraft === drafts[0] ? drafts[1] : drafts[0];
  const question = cut(
    first.length >= LIMITS.post.title.min ? first : `Fans ask: ${first}`,
    LIMITS.post.title.max,
  );
  return { isQuestion: true, question, draft: cut(draft, LIMITS.pitch.reply.max) };
}
