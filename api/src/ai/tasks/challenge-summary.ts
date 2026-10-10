import { z } from 'zod';
import { plainLine, trimLine, UNTRUSTED_DATA_RULES, untrustedBlock } from '../guard.js';
import { type AiRuntime, runAiTask } from '../run.js';
import type { AiContext, ChallengeSummaryInput, ChallengeSummaryOutput } from '../types.js';

/**
 * challengeSummary (fast tier): a short private recap of a closed challenge's entries for the
 * creator, stored in asks.response_summary.summary (workers/close-challenges.ts). It describes
 * what fans sent in; it never ranks, scores or judges the people who entered.
 */

export const CHALLENGE_SUMMARY_MAX = 400;
/** Entries sent to the model (oldest first is the caller's order). */
export const CHALLENGE_ENTRIES_MAX = 50;

export const challengeSummarySchema = z.object({
  summary: z.string().describe(`At most ${CHALLENGE_SUMMARY_MAX} characters.`),
});

export const challengeSummaryInstructions = `You recap a closed creator challenge on Fellow Owners for the creator who ran it. Fans entered by posting ideas; you see each entry's title and, when there is one, a one-line summary.

Rules:
- summary: 1 to 3 plain sentences, at most ${CHALLENGE_SUMMARY_MAX} characters, on what fans sent in: common themes, the range of entries, anything that stands out.
- Use only the entries listed. Never invent entries, people or numbers.
- Do not score, rank or judge the people who entered. No emojis, no markdown.

${UNTRUSTED_DATA_RULES}

Respond with only a JSON object: {"summary": "..."}.`;

export function challengeSummaryPrompt(input: ChallengeSummaryInput): string {
  const entries = input.entries.slice(0, CHALLENGE_ENTRIES_MAX);
  const lines = entries.map(
    (entry, i) =>
      `${i + 1}. ${trimLine(entry.title, 120)}${entry.summary ? ` | ${trimLine(entry.summary, 160)}` : ''}`,
  );
  return [
    `Challenge: ${plainLine(input.title)}`,
    `Entries: ${input.entries.length}`,
    '',
    'Entries (written by fans):',
    untrustedBlock('entries', lines.join('\n'), 12_000),
  ].join('\n');
}

export async function challengeSummary(
  rt: AiRuntime,
  input: ChallengeSummaryInput,
  ctx: AiContext,
): Promise<ChallengeSummaryOutput> {
  const { output } = await runAiTask(rt, {
    task: 'challengeSummary',
    tier: 'fast',
    ctx,
    instructions: challengeSummaryInstructions,
    prompt: challengeSummaryPrompt(input),
    schema: challengeSummarySchema,
    schemaName: 'challenge_summary',
    temperature: 0.3,
    maxOutputTokens: 400,
    timeoutMs: 15_000,
    check: (raw) => (raw.summary.trim() ? null : 'the summary is empty'),
  });
  return { summary: trimLine(output.summary, CHALLENGE_SUMMARY_MAX) };
}
