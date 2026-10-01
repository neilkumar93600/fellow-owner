import { z } from 'zod';
import {
  keyItems,
  normalizeKeywords,
  plainLine,
  resolveKeys,
  trimLine,
  UNTRUSTED_DATA_RULES,
  untrustedBlock,
} from '../guard.js';
import { type AiRuntime, runAiTask } from '../run.js';
import type { AiContext, CommunityDigestInput, CommunityDigestOutput } from '../types.js';

/**
 * communityDigest (P1, smart tier): a one-paragraph weekly digest of one community (themes and
 * standout posts) for StudioCommunity.digest. One per community per day, enforced by the caller
 * (digests table); run.ts only keeps a safety cap. Not wired to a route yet.
 */

export const DIGEST_SUMMARY_MAX = 280;
export const DIGEST_THEMES_MAX = 3;
export const DIGEST_THEME_CHARS = 40;
export const DIGEST_STANDOUTS_MAX = 3;
export const DIGEST_WHY_MAX = 140;
/** Posts sent to the model (most signals first is the caller's job). */
export const DIGEST_POSTS_MAX = 60;

export interface RawCommunityDigest {
  summary: string;
  themes: string[];
  standouts: Array<{ post: string; why: string }>;
}

export function communityDigestSchema(keys: readonly string[]): z.ZodType<RawCommunityDigest> {
  const [first, ...rest] = keys;
  return z.object({
    summary: z.string().describe(`At most ${DIGEST_SUMMARY_MAX} characters.`),
    themes: z.array(z.string()).describe(`0 to ${DIGEST_THEMES_MAX} short noun phrases.`),
    standouts: z
      .array(
        z.object({
          post: (first ? z.enum([first, ...rest]) : z.string()).describe('Key of a listed post.'),
          why: z.string().describe(`At most ${DIGEST_WHY_MAX} characters.`),
        }),
      )
      .describe(`0 to ${DIGEST_STANDOUTS_MAX} posts.`),
  });
}

export const communityDigestInstructions = `You write a short weekly digest of one community on Fellow Owners for the creator who runs it.

Rules:
- summary: at most ${DIGEST_SUMMARY_MAX} characters on what the community talked about and built this week, in plain words.
- themes: 0 to ${DIGEST_THEMES_MAX} short lowercase noun phrases (at most ${DIGEST_THEME_CHARS} characters each) for recurring topics.
- standouts: 0 to ${DIGEST_STANDOUTS_MAX} posts worth the creator's attention, by key (p1, p2 ...), each with a reason of at most ${DIGEST_WHY_MAX} characters.
- Use only the posts listed. Never invent posts, people or numbers. No emojis, no markdown.

${UNTRUSTED_DATA_RULES}

Respond with only a JSON object: {"summary": "...", "themes": ["..."], "standouts": [{"post": "p1", "why": "..."}]}.`;

export function communityDigestPrompt(input: CommunityDigestInput): string {
  const keyed = keyItems('p', input.posts.slice(0, DIGEST_POSTS_MAX));
  const lines = keyed.map(
    ({ key, item }) =>
      `${key} | signals ${item.signals} | ${trimLine(item.title, 120)}${item.summary ? ` | ${trimLine(item.summary, 140)}` : ''}`,
  );
  return [
    `Community: ${plainLine(input.communityName)}`,
    `Week ending: ${input.periodDate} (UTC)`,
    '',
    'Posts this week (written by members):',
    lines.length > 0 ? untrustedBlock('posts', lines.join('\n'), 20_000) : 'No posts this week.',
  ].join('\n');
}

export function normalizeCommunityDigest(
  raw: RawCommunityDigest,
  input: CommunityDigestInput,
  model: string,
): CommunityDigestOutput {
  const keyed = keyItems('p', input.posts.slice(0, DIGEST_POSTS_MAX));
  const whyByKey = new Map(raw.standouts.map((s) => [s.post.trim().toLowerCase(), s.why]));
  const { items } = resolveKeys(
    raw.standouts.map((s) => s.post),
    keyed,
  );
  return {
    summary: trimLine(raw.summary, DIGEST_SUMMARY_MAX),
    themes: normalizeKeywords(raw.themes, { max: DIGEST_THEMES_MAX, itemMax: DIGEST_THEME_CHARS }),
    standouts: items.slice(0, DIGEST_STANDOUTS_MAX).map(({ key, item }) => ({
      refId: item.id,
      why:
        trimLine(whyByKey.get(key) ?? '', DIGEST_WHY_MAX) || trimLine(item.title, DIGEST_WHY_MAX),
    })),
    model,
  };
}

export async function communityDigest(
  rt: AiRuntime,
  input: CommunityDigestInput,
  ctx: AiContext,
): Promise<CommunityDigestOutput> {
  const keyed = keyItems('p', input.posts.slice(0, DIGEST_POSTS_MAX));
  const { output, model } = await runAiTask(rt, {
    task: 'communityDigest',
    tier: 'smart',
    ctx,
    instructions: communityDigestInstructions,
    prompt: communityDigestPrompt(input),
    schema: communityDigestSchema(keyed.map((entry) => entry.key)),
    schemaName: 'community_digest',
    temperature: 0.4,
    maxOutputTokens: 1_000,
    check: (raw, final) => {
      if (final) return raw.summary.trim() ? null : 'the summary is empty';
      const { unknown } = resolveKeys(
        raw.standouts.map((s) => s.post),
        keyed,
      );
      if (!raw.summary.trim()) return 'the summary is empty';
      return unknown.length > 0 ? `unknown post keys ${unknown.slice(0, 5).join(', ')}` : null;
    },
  });
  return normalizeCommunityDigest(output, input, model);
}
