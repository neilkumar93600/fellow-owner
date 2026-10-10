import { type BriefingRefType, LIMITS } from '@fellow-owners/shared';
import { z } from 'zod';
import {
  keyItems,
  plainLine,
  tasteProfileBlock,
  trimLine,
  trimText,
  truncateText,
  UNTRUSTED_DATA_RULES,
  untrustedBlock,
} from '../guard.js';
import { type AiRuntime, runAiTask } from '../run.js';
import type { AiContext, AskAiInput, AskAiOutput } from '../types.js';

/**
 * askAI (P1, smart tier, "Ask your AI"): answers the creator's question from the top 20
 * semantic matches only, citing them. Matches are listed by key (m1..m20); the answer cites
 * them inline as [m3], which become [1], [2] ... indexes into `citations`. Unknown keys are
 * removed. 30 calls per space per day (run.ts). Not wired to a route yet.
 */

export const ASK_MATCHES_MAX = 20;
export const ASK_ANSWER_MAX = 1_200;
export const ASK_EXCERPT_CHARS = 500;

export interface RawAskAi {
  answer: string;
  citations: string[];
}

export function askAiSchema(keys: readonly string[]): z.ZodType<RawAskAi> {
  const [first, ...rest] = keys;
  return z.object({
    answer: z.string().describe(`At most ${ASK_ANSWER_MAX} characters, citing items as [m1].`),
    citations: z
      .array(first ? z.enum([first, ...rest]) : z.string())
      .describe('Keys of the items the answer relies on.'),
  });
}

export function askAiInstructions(creatorName: string): string {
  const creator = plainLine(creatorName) || 'the creator';
  return `You answer questions from ${creator}, a creator on Fellow Owners, about their own community: posts, pitches and members.

Rules:
- Answer only from the items listed, which a search picked for this question. If they do not answer it, say so plainly.
- Cite every item you rely on inline with its key in brackets, for example [m3], and list those keys in citations.
- At most ${ASK_ANSWER_MAX} characters. Plain sentences or a short list; no headings.
- Never invent items, people, numbers or quotes. Never reveal email addresses.

${UNTRUSTED_DATA_RULES}

Respond with only a JSON object: {"answer": "...", "citations": ["m1"]}.`;
}

const LABELS: Record<BriefingRefType, string> = {
  post: 'post',
  inbound: 'pitch',
  membership: 'member',
};

export function askAiPrompt(input: AskAiInput): string {
  const keyed = keyItems('m', input.matches.slice(0, ASK_MATCHES_MAX));
  const items = keyed
    .map(({ key, item }) =>
      [
        `${key} (${LABELS[item.refType]}): ${trimLine(item.title, 160)}`,
        item.summary ? `summary: ${trimLine(item.summary, LIMITS.ai.summaryMax)}` : null,
        `excerpt: ${truncateText(item.excerpt.replace(/\s+/g, ' ').trim(), ASK_EXCERPT_CHARS)}`,
      ]
        .filter(Boolean)
        .join('\n'),
    )
    .join('\n\n');
  return [
    tasteProfileBlock(input.tasteProfile),
    '',
    `Question: ${trimLine(input.question, 500)}`,
    '',
    'Items (written by community members):',
    keyed.length > 0 ? untrustedBlock('items', items, 20_000) : 'No items matched.',
  ].join('\n');
}

const CITATION = /\[(m\d{1,3})\]/gi;

export function normalizeAskAi(raw: RawAskAi, input: AskAiInput, model: string): AskAiOutput {
  const keyed = keyItems('m', input.matches.slice(0, ASK_MATCHES_MAX));
  const byKey = new Map(keyed.map((entry) => [entry.key, entry.item]));
  const order: string[] = [];
  const add = (key: string) => {
    const normalized = key.trim().toLowerCase();
    if (byKey.has(normalized) && !order.includes(normalized)) order.push(normalized);
  };
  for (const match of raw.answer.matchAll(CITATION)) add(match[1] ?? '');
  for (const key of raw.citations) add(key);
  const answer = trimText(
    raw.answer.replace(CITATION, (_, key: string) => {
      const index = order.indexOf(key.toLowerCase());
      return index >= 0 ? `[${index + 1}]` : '';
    }),
    ASK_ANSWER_MAX,
  );
  return {
    answer,
    citations: order.flatMap((key) => {
      const item = byKey.get(key);
      return item ? [{ refType: item.refType, refId: item.refId, title: item.title }] : [];
    }),
    model,
  };
}

export async function askAI(
  rt: AiRuntime,
  input: AskAiInput,
  ctx: AiContext,
): Promise<AskAiOutput> {
  const keys = keyItems('m', input.matches.slice(0, ASK_MATCHES_MAX)).map((entry) => entry.key);
  const { output, model } = await runAiTask(rt, {
    task: 'askAI',
    tier: 'smart',
    ctx,
    instructions: askAiInstructions(input.creatorName),
    prompt: askAiPrompt(input),
    schema: askAiSchema(keys),
    schemaName: 'answer',
    temperature: 0.2,
    maxOutputTokens: 1_200,
    timeoutMs: 25_000,
    deadlineMs: 40_000,
    check: (raw, final) => {
      if (!raw.answer.trim()) return 'the answer is empty';
      if (final) return null;
      const known = new Set(keys);
      const unknown = [
        ...[...raw.answer.matchAll(CITATION)].map((match) => match[1] ?? ''),
        ...raw.citations,
      ].filter((key) => !known.has(key.trim().toLowerCase()));
      return unknown.length > 0
        ? `unknown item keys ${[...new Set(unknown)].slice(0, 5).join(', ')}; cite only listed keys`
        : null;
    },
  });
  return normalizeAskAi(output, input, model);
}
