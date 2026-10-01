import { LIMITS } from '@fellow-owners/shared';
import { z } from 'zod';
import {
  keyItems,
  plainLine,
  resolveKeys,
  sanitizeUntrusted,
  trimLine,
  truncateText,
  UNTRUSTED_DATA_RULES,
  untrustedBlock,
} from '../guard.js';
import { type AiRuntime, runAiTask } from '../run.js';
import type { AiContext, ClusterImportInput, ClusterImportOutput } from '../types.js';

/**
 * clusterImport (P1, smart tier, F24 "Import your audience"): groups pasted comments into 2..6
 * suggested communities with a description and sample quotes. Comments are listed by key
 * (k1..k500) and quotes are resolved from those keys, so every quote is a real comment.
 * Not wired to a route yet.
 */

export const IMPORT_COMMENTS_MAX = 500;
export const IMPORT_COMMENT_CHARS = 300;
/** Total comment text sent (about 15k tokens). */
export const IMPORT_TOTAL_CHARS = 60_000;
export const IMPORT_COMMUNITIES = { min: 2, max: 6 } as const;
export const IMPORT_QUOTES_MAX = 3;
export const IMPORT_QUOTE_CHARS = 160;

export interface RawClusterImport {
  communities: Array<{ name: string; description: string; sampleComments: string[] }>;
}

export const clusterImportSchema: z.ZodType<RawClusterImport> = z.object({
  communities: z
    .array(
      z.object({
        name: z
          .string()
          .describe(`${LIMITS.community.name.min} to ${LIMITS.community.name.max} characters.`),
        description: z.string().describe(`At most ${LIMITS.community.description.max} characters.`),
        sampleComments: z
          .array(z.string())
          .describe(`Up to ${IMPORT_QUOTES_MAX} comment keys (k1, k2 ...) that show the group.`),
      }),
    )
    .describe(`${IMPORT_COMMUNITIES.min} to ${IMPORT_COMMUNITIES.max} groups.`),
});

export function clusterImportInstructions(creatorName: string): string {
  const creator = plainLine(creatorName) || 'the creator';
  return `You help ${creator}, a creator, turn their audience into communities on Fellow Owners. You read comments their audience left and suggest communities people would join.

Rules:
- Suggest ${IMPORT_COMMUNITIES.min} to ${IMPORT_COMMUNITIES.max} communities around shared interests, skills or goals that many comments express. Skip one-off topics, spam and generic praise.
- name: ${LIMITS.community.name.min} to ${LIMITS.community.name.max} characters, friendly and specific (for example "Home Cooks" or "Indie Game Devs"). Do not repeat the existing communities.
- description: one sentence of at most ${LIMITS.community.description.max} characters on who it is for.
- sampleComments: up to ${IMPORT_QUOTES_MAX} keys of comments that show the group best.
- Never invent comments. No emojis, no markdown.

${UNTRUSTED_DATA_RULES}

Respond with only a JSON object: {"communities": [{"name": "...", "description": "...", "sampleComments": ["k1"]}]}.`;
}

function preparedComments(input: ClusterImportInput): string[] {
  const out: string[] = [];
  let total = 0;
  for (const comment of input.comments.slice(0, IMPORT_COMMENTS_MAX)) {
    const clean = truncateText(
      sanitizeUntrusted(comment).replace(/\s+/g, ' '),
      IMPORT_COMMENT_CHARS,
    );
    if (!clean) continue;
    if (total + clean.length > IMPORT_TOTAL_CHARS) break;
    total += clean.length;
    out.push(clean);
  }
  return out;
}

export function clusterImportPrompt(input: ClusterImportInput): string {
  const keyed = keyItems('k', preparedComments(input));
  const existing =
    input.existingCommunities.length > 0
      ? input.existingCommunities.map((name) => plainLine(name)).join(', ')
      : 'none';
  return [
    `Existing communities: ${existing}`,
    '',
    `Comments (${keyed.length}):`,
    untrustedBlock(
      'comments',
      keyed.map(({ key, item }) => `${key}: ${item}`).join('\n'),
      IMPORT_TOTAL_CHARS + keyed.length * 8,
    ),
  ].join('\n');
}

export function normalizeClusterImport(
  raw: RawClusterImport,
  input: ClusterImportInput,
  model: string,
): ClusterImportOutput {
  const keyed = keyItems('k', preparedComments(input));
  const taken = new Set(input.existingCommunities.map((name) => plainLine(name).toLowerCase()));
  const communities: ClusterImportOutput['communities'] = [];
  for (const suggestion of raw.communities) {
    const name = trimLine(suggestion.name, LIMITS.community.name.max);
    if (name.length < LIMITS.community.name.min || taken.has(name.toLowerCase())) continue;
    taken.add(name.toLowerCase());
    const { items } = resolveKeys(suggestion.sampleComments, keyed);
    communities.push({
      name,
      description: trimLine(suggestion.description, LIMITS.community.description.max),
      sampleQuotes: items
        .slice(0, IMPORT_QUOTES_MAX)
        .map(({ item }) => truncateText(item, IMPORT_QUOTE_CHARS)),
    });
    if (communities.length >= IMPORT_COMMUNITIES.max) break;
  }
  return { communities, model };
}

export async function clusterImport(
  rt: AiRuntime,
  input: ClusterImportInput,
  ctx: AiContext,
): Promise<ClusterImportOutput> {
  const { output, model } = await runAiTask(rt, {
    task: 'clusterImport',
    tier: 'smart',
    ctx,
    instructions: clusterImportInstructions(input.creatorName),
    prompt: clusterImportPrompt(input),
    schema: clusterImportSchema,
    schemaName: 'community_clusters',
    temperature: 0.3,
    maxOutputTokens: 2_000,
    timeoutMs: 45_000,
    deadlineMs: 75_000,
    check: (raw, final) => {
      const count = normalizeClusterImport(raw, input, '').communities.length;
      if (final) return count > 0 ? null : 'no usable community suggestions';
      return count < IMPORT_COMMUNITIES.min
        ? `suggest at least ${IMPORT_COMMUNITIES.min} new communities with names of ${LIMITS.community.name.min} to ${LIMITS.community.name.max} characters`
        : null;
    },
  });
  return normalizeClusterImport(output, input, model);
}
