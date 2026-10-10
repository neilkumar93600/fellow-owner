import { LIMITS } from '@fellow-owners/shared';
import { z } from 'zod';
import { clampUnit, plainLine, trimLine, UNTRUSTED_DATA_RULES, untrustedBlock } from '../guard.js';
import { type AiRuntime, runAiTask } from '../run.js';
import type { AiContext, SuggestCommunitiesInput, SuggestCommunitiesOutput } from '../types.js';

/**
 * suggestCommunities (fast tier, 02-trd): from a new member's intro, preselect the communities
 * they most likely want ("AI suggested" chips in join step 2). Capped at 10 calls per user per
 * hour in run.ts. Only slugs we sent can come back (enum in the schema, checked again in code).
 */

/** At most this many suggestions are preselected. */
export const MAX_SUGGESTIONS = 3;
/** Weaker guesses are dropped rather than preselected. */
export const MIN_CONFIDENCE = 0.3;

export function suggestCommunitiesSchema(slugs: readonly [string, ...string[]]) {
  return z.object({
    suggestions: z
      .array(
        z.object({
          slug: z.enum(slugs).describe('Exact slug of one listed community.'),
          confidence: z.number().describe('From 0 to 1.'),
        }),
      )
      .describe('Best match first; empty when nothing fits.'),
  });
}

export const suggestCommunitiesInstructions = `You help a new member choose which of a creator's communities to join on Fellow Owners, based on the short intro they wrote about themselves.

Rules:
- Choose only from the listed communities and copy their slugs exactly.
- Suggest 1 to ${MAX_SUGGESTIONS} communities that clearly match the intro, best first. Fewer is better than a weak match; return an empty list when nothing fits.
- confidence is a number from 0 to 1: 0.9 or more when the intro names the community's topic directly, about 0.6 for a reasonable inference, below 0.4 for a guess.
- Judge only what the member says about their skills, interests and goals.

${UNTRUSTED_DATA_RULES}

Respond with only a JSON object: {"suggestions": [{"slug": "...", "confidence": 0.0}]}.`;

export function suggestCommunitiesPrompt(input: SuggestCommunitiesInput): string {
  const list = input.communities
    .map((community) => {
      const description = community.description
        ? ` - ${trimLine(community.description, LIMITS.community.description.max)}`
        : '';
      return `- ${community.slug}: ${plainLine(community.name)}${description}`;
    })
    .join('\n');
  return [
    'Communities (slug: name - description):',
    list,
    '',
    "The member's intro:",
    untrustedBlock('member intro', input.intro, LIMITS.membership.intro.max),
  ].join('\n');
}

/** Known slugs only, deduplicated, confidence clamped, weak guesses dropped, best first. */
export function normalizeSuggestions(
  raw: { suggestions: Array<{ slug: string; confidence: number }> },
  input: SuggestCommunitiesInput,
): SuggestCommunitiesOutput {
  const known = new Map(input.communities.map((c) => [c.slug.toLowerCase(), c.slug]));
  const seen = new Set<string>();
  const suggestions: SuggestCommunitiesOutput['suggestions'] = [];
  for (const entry of raw.suggestions) {
    const slug = known.get(entry.slug.trim().toLowerCase());
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    const confidence = clampUnit(entry.confidence);
    if (confidence >= MIN_CONFIDENCE) suggestions.push({ slug, confidence });
  }
  suggestions.sort((a, b) => b.confidence - a.confidence);
  return { suggestions: suggestions.slice(0, MAX_SUGGESTIONS) };
}

export async function suggestCommunities(
  rt: AiRuntime,
  input: SuggestCommunitiesInput,
  ctx: AiContext,
): Promise<SuggestCommunitiesOutput> {
  const [first, ...rest] = input.communities.map((community) => community.slug);
  // Nothing to choose from: no model call, no ai_runs row.
  if (!first) return { suggestions: [] };
  const { output } = await runAiTask(rt, {
    task: 'suggestCommunities',
    tier: 'fast',
    ctx,
    instructions: suggestCommunitiesInstructions,
    prompt: suggestCommunitiesPrompt(input),
    schema: suggestCommunitiesSchema([first, ...rest]),
    schemaName: 'community_suggestions',
    temperature: 0,
    maxOutputTokens: 800,
    // Interactive (join step 2): fail fast and let the UI show "Suggestions unavailable".
    timeoutMs: 9_000,
    deadlineMs: 13_000,
  });
  return normalizeSuggestions(output, input);
}
