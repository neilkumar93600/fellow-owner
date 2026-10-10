import { LIMITS } from '@fellow-owners/shared';
import { z } from 'zod';
import {
  containsContactDetails,
  plainLine,
  trimText,
  UNTRUSTED_DATA_RULES,
  untrustedBlock,
  voiceSamplesBlock,
} from '../guard.js';
import { type AiRuntime, runAiTask } from '../run.js';
import type { AiContext, QuestionGroupInput, QuestionGroupOutput } from '../types.js';

/**
 * questionGroup (F32 Answer Once, smart tier): several fans asked the same thing. Names the
 * shared question in one line and drafts one answer in the creator's voice, which the creator
 * edits before it goes to every asker. `isQuestion: false` when the messages do not share one
 * real question (the grouping job then does not create the group).
 * Callers: workers/group-questions.ts and POST /api/studio/question-groups/:id/redraft.
 */

/** Drafts aim for this; the stored answer limit is LIMITS.pitch.reply.max. */
export const ANSWER_TARGET_CHARS = 700;

export const questionGroupSchema = z.object({
  isQuestion: z.boolean().describe('True only when the messages ask one shared question.'),
  question: z.string().describe('The shared question, one line, at most 100 characters.'),
  draft: z.string().describe(`The answer, at most ${ANSWER_TARGET_CHARS} characters.`),
});

export function questionGroupInstructions(creatorName: string): string {
  const creator = plainLine(creatorName) || 'the creator';
  return `Several fans of ${creator}, a creator on Fellow Owners, sent messages that may ask the same thing. ${creator} wants to answer them all at once and edits your draft before sending it.

Rules:
- isQuestion: true only when most messages ask one shared question or request. Otherwise false, and leave question and draft empty.
- question: that shared question in one plain line, at most 100 characters, in the fans' terms. No names.
- draft: ${creator}'s answer, first person, in their voice (use the voice samples for tone only), 2 to 5 sentences, at most ${ANSWER_TARGET_CHARS} characters. It goes to every fan who asked, so do not address one person by name.
- Never invent facts about ${creator}, and never commit to money, deals or dates. If the answer needs facts you do not have, say an answer is coming and what it will cover.
- Never include email addresses, phone numbers, links or @handles.
- No markdown. At most one emoji, and only if the voice samples use them.

${UNTRUSTED_DATA_RULES}

Respond with only a JSON object: {"isQuestion": true, "question": "...", "draft": "..."}.`;
}

export function questionGroupPrompt(input: QuestionGroupInput): string {
  const voice = (input.voice ?? '').split('\n\n').filter((sample) => sample.trim());
  const parts = [
    voiceSamplesBlock(voice),
    '',
    `What the fans wrote (${input.quotes.length} messages, one per line):`,
    untrustedBlock(
      'fan messages',
      input.quotes.map((quote) => `- ${plainLine(quote)}`).join('\n'),
      LIMITS.ai.inputCharsMax,
    ),
  ];
  if (input.previousDraft) {
    parts.push(
      '',
      'Write a different draft from this one (do not reuse its sentences):',
      untrustedBlock('previous draft', input.previousDraft, LIMITS.pitch.reply.max),
    );
  }
  return parts.join('\n');
}

function outputProblem(output: z.output<typeof questionGroupSchema>): string | null {
  if (!output.isQuestion) return null;
  if (!plainLine(output.question)) return 'the question is empty';
  if (!output.draft.trim()) return 'the draft is empty';
  if (containsContactDetails(output.draft)) {
    return 'the draft contains an email address or phone number';
  }
  if (/https?:\/\/|www\.|@\w/i.test(output.draft)) return 'the draft contains a link or @handle';
  return null;
}

export async function questionGroup(
  rt: AiRuntime,
  input: QuestionGroupInput,
  ctx: AiContext,
): Promise<QuestionGroupOutput> {
  const { output } = await runAiTask(rt, {
    task: 'questionGroup',
    tier: 'smart',
    ctx,
    instructions: questionGroupInstructions(input.creatorName),
    prompt: questionGroupPrompt(input),
    schema: questionGroupSchema,
    schemaName: 'question_group',
    temperature: 0.5,
    maxOutputTokens: 900,
    timeoutMs: 20_000,
    deadlineMs: 30_000,
    // A risky draft is fatal on the last attempt: no draft beats one with contact details.
    check: (raw) => outputProblem(raw),
  });
  if (!output.isQuestion) return { isQuestion: false, question: '', draft: '' };
  return {
    isQuestion: true,
    question: plainLine(output.question).slice(0, LIMITS.post.title.max),
    draft: trimText(output.draft, LIMITS.pitch.reply.max),
  };
}
