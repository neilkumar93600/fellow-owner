import { type BriefingRefType, LIMITS } from '@fellow-owners/shared';
import { z } from 'zod';
import {
  ensureIdsInCandidates,
  keyItems,
  numbersIn,
  plainLine,
  significantNumbers,
  tasteProfileBlock,
  trimLine,
  UNTRUSTED_DATA_RULES,
  untrustedBlock,
} from '../guard.js';
import { type AiRuntime, runAiTask } from '../run.js';
import type {
  AiContext,
  BriefingCandidate,
  BriefingCounts,
  BriefingInput,
  BriefingOutput,
} from '../types.js';

/**
 * briefing (smart tier, 02-trd data flow 3): the Today screen's headline, 3..5 highlights and
 * 0..2 watchouts. Code picks the candidates (max 40) and the counts; the model only chooses
 * among them and explains why. Candidates are listed by short key (c1..c40) and the schema
 * only accepts those keys, so a highlight can never point at an item we did not send. Numbers
 * the model writes must come from the counts or candidates.
 *
 * Called by briefing.service (1 per space per day + 5 regenerations, enforced there).
 */

const B = LIMITS.briefing;
export const WATCHOUT_MAX = 200;

export interface RawBriefing {
  headline: string;
  highlights: Array<{ candidate: string; why: string }>;
  watchouts: string[];
}

export function briefingSchema(keys: readonly string[]): z.ZodType<RawBriefing> {
  const [first, ...rest] = keys;
  const candidate = first ? z.enum([first, ...rest]) : z.string();
  return z.object({
    headline: z.string().describe(`One sentence of at most ${B.headlineMax} characters.`),
    highlights: z
      .array(
        z.object({
          candidate: candidate.describe('Key of a listed candidate, e.g. "c3".'),
          why: z.string().describe(`One sentence of at most ${B.whyMax} characters.`),
        }),
      )
      .describe(`${B.highlights.min} to ${B.highlights.max} items, most important first.`),
    watchouts: z.array(z.string()).describe(`0 to ${B.watchoutsMax} short sentences.`),
  });
}

export function briefingInstructions(creatorName: string): string {
  const creator = plainLine(creatorName) || 'the creator';
  return `You write the daily briefing for ${creator}, a creator who runs communities of fans on Fellow Owners. It sits at the top of their dashboard and tells them, in under a minute, what deserves their attention today.

You get their taste profile, counts for the last 7 days, and candidates (posts, pitches and members) picked by code. Candidates are listed by key: c1, c2 and so on.

Rules:
- headline: one sentence of at most ${B.headlineMax} characters about the most important thing today. Use only numbers that appear in the counts or the candidates.
- highlights: choose ${B.highlights.min} to ${B.highlights.max} candidates the creator should look at first (fewer only if fewer are listed). Prefer high fit scores, strong signals and items that match a "promote" line; skip anything that touches a "never" line. Refer to each by its key, at most once. Never invent keys.
- why: one sentence of at most ${B.whyMax} characters, addressed to the creator as "you", saying why it matters now. Cite the taste-profile line it matches or the concrete signal (fit score, signals, team joins). Do not just repeat the title.
- watchouts: 0 to ${B.watchoutsMax} short sentences about things that need attention, such as many pitches filtered as spam, items waiting for AI review, or a quiet community. Base them only on the counts. Return an empty list when nothing needs attention.
- Never invent facts, names or numbers. Plain, warm, concise English. No emojis, no markdown.

${UNTRUSTED_DATA_RULES}

Respond with only a JSON object: {"headline": "...", "highlights": [{"candidate": "c1", "why": "..."}], "watchouts": ["..."]}.`;
}

const REF_LABELS: Record<BriefingRefType, string> = {
  post: 'post',
  inbound: 'pitch',
  membership: 'member',
};

function candidateLine(key: string, candidate: BriefingCandidate): string {
  const parts = [
    key,
    REF_LABELS[candidate.refType],
    candidate.fitScore !== null ? `fit ${candidate.fitScore}` : 'fit pending',
  ];
  if (candidate.signals !== undefined) parts.push(`signals ${candidate.signals}`);
  parts.push(`title: ${trimLine(candidate.title, LIMITS.post.title.max)}`);
  if (candidate.summary)
    parts.push(`summary: ${trimLine(candidate.summary, LIMITS.ai.summaryMax)}`);
  if (candidate.reason) parts.push(`note: ${trimLine(candidate.reason, LIMITS.ai.fitReasonMax)}`);
  return parts.join(' | ');
}

function countsBlock(counts: BriefingCounts): string {
  const lines = [
    'Counts (last 7 days unless noted):',
    `- members in total: ${counts.members} (${counts.newMembers7d} new this week)`,
    `- new posts and ideas: ${counts.ideas7d}`,
    `- new pitches: ${counts.pitches7d}; filtered as spam: ${counts.filteredSpam7d}`,
    `- opportunities waiting (new pitches with fit 70 or more): ${counts.opportunitiesWaiting}`,
    `- items waiting for AI review: ${counts.pendingAnalysis}`,
  ];
  if (counts.perCommunity.length > 0) {
    lines.push('Per community (last 7 days):');
    for (const community of counts.perCommunity) {
      lines.push(
        `- ${plainLine(community.name)}: ${community.posts7d} posts, ${community.joins7d} joins`,
      );
    }
  }
  return lines.join('\n');
}

export function briefingPrompt(input: BriefingInput): string {
  const keyed = keyItems('c', input.candidates.slice(0, B.candidatesMax));
  const candidates =
    keyed.length > 0
      ? untrustedBlock(
          'candidates',
          keyed.map(({ key, item }) => candidateLine(key, item)).join('\n'),
          30_000,
        )
      : 'Candidates: none yet.';
  return [
    `Date: ${input.periodDate} (UTC)`,
    `Creator: ${plainLine(input.creatorName) || 'the creator'}`,
    '',
    tasteProfileBlock(input.tasteProfile),
    '',
    countsBlock(input.counts),
    '',
    'Candidates (picked by code; titles and summaries were written by fans):',
    candidates,
  ].join('\n');
}

/** The code-written headline used when the model's headline cannot be trusted. */
export function fallbackBriefingHeadline(counts: BriefingCounts): string {
  return trimLine(
    `${counts.newMembers7d} new fans, ${counts.ideas7d} ideas and ${counts.pitches7d} fan messages this week`,
    B.headlineMax,
  );
}

/** Every number the briefing may mention. */
function knownNumbers(input: BriefingInput): Set<string> {
  const { perCommunity, ...totals } = input.counts;
  const facts = [
    input.periodDate,
    ...Object.values(totals),
    ...perCommunity.flatMap((c) => [c.name, c.posts7d, c.joins7d]),
    ...input.candidates.flatMap((c) => [
      c.title,
      c.summary ?? '',
      c.reason ?? '',
      c.fitScore ?? '',
      c.signals ?? '',
    ]),
  ];
  return numbersIn(facts.join(' '));
}

function supportedBy(text: string, known: Set<string>): boolean {
  return significantNumbers(text).every((number) => known.has(number));
}

function fallbackWhy(candidate: BriefingCandidate): string {
  const base =
    candidate.reason ??
    candidate.summary ??
    `${REF_LABELS[candidate.refType]} that stands out this week`;
  // Same tiers as the web MatchLabel: 80 and up "Strong match", 60 to 79 "Worth a look"; no number.
  const { fitScore } = candidate;
  const match =
    fitScore === null || fitScore < 60
      ? ''
      : fitScore >= 80
        ? ' (Strong match)'
        : ' (Worth a look)';
  return trimLine(`${base}${match}`, B.whyMax);
}

function resolveHighlights(raw: RawBriefing, input: BriefingInput) {
  const keyed = keyItems('c', input.candidates.slice(0, B.candidatesMax));
  const byKey = new Map(keyed.map((entry) => [entry.key, entry.item]));
  const seen = new Set<string>();
  const valid: Array<{ candidate: BriefingCandidate; why: string }> = [];
  const unknown: string[] = [];
  for (const highlight of raw.highlights) {
    const key = highlight.candidate.trim().toLowerCase();
    const candidate = byKey.get(key);
    if (!candidate) {
      unknown.push(highlight.candidate);
      continue;
    }
    if (seen.has(key)) continue;
    seen.add(key);
    valid.push({ candidate, why: highlight.why });
  }
  return { valid, unknown, available: keyed.length };
}

/** Maps keys back to refs, trims texts, drops unsupported numbers. */
export function normalizeBriefing(
  raw: RawBriefing,
  input: BriefingInput,
  model: string,
): BriefingOutput {
  const known = knownNumbers(input);
  const { valid } = resolveHighlights(raw, input);
  const highlights = valid.slice(0, B.highlights.max).map(({ candidate, why }) => {
    const text = trimLine(why, B.whyMax);
    return {
      refType: candidate.refType,
      refId: candidate.refId,
      why: text && supportedBy(text, known) ? text : fallbackWhy(candidate),
    };
  });
  const headline = trimLine(raw.headline, B.headlineMax);
  const watchouts = raw.watchouts
    .map((watchout) => trimLine(watchout, WATCHOUT_MAX))
    .filter((watchout) => watchout.length > 0 && supportedBy(watchout, known))
    .slice(0, B.watchoutsMax);
  return {
    headline:
      headline && supportedBy(headline, known) ? headline : fallbackBriefingHeadline(input.counts),
    // Defense in depth: the keys already guarantee this.
    highlights: ensureIdsInCandidates(highlights, input.candidates).kept,
    watchouts,
    model,
  };
}

export function checkBriefing(
  raw: RawBriefing,
  input: BriefingInput,
  final: boolean,
): string | null {
  const { valid, unknown, available } = resolveHighlights(raw, input);
  const required = Math.min(B.highlights.min, available);
  if (final) {
    return available > 0 && valid.length === 0
      ? 'no highlight referenced a listed candidate'
      : null;
  }
  const problems: string[] = [];
  if (unknown.length > 0) problems.push(`unknown candidate keys ${unknown.slice(0, 5).join(', ')}`);
  if (valid.length < required) {
    problems.push(
      `pick ${required} to ${Math.min(B.highlights.max, available)} different candidates by key`,
    );
  }
  if (!supportedBy(raw.headline, knownNumbers(input))) {
    problems.push('the headline uses numbers that are not in the counts or candidates');
  }
  return problems.length > 0 ? problems.join('; ') : null;
}

export async function briefing(
  rt: AiRuntime,
  input: BriefingInput,
  ctx: AiContext,
): Promise<BriefingOutput> {
  const keys = keyItems('c', input.candidates.slice(0, B.candidatesMax)).map((entry) => entry.key);
  const { output, model } = await runAiTask(rt, {
    task: 'briefing',
    tier: 'smart',
    ctx,
    instructions: briefingInstructions(input.creatorName),
    prompt: briefingPrompt(input),
    schema: briefingSchema(keys),
    schemaName: 'briefing',
    schemaDescription: "The creator's daily briefing",
    temperature: 0.4,
    maxOutputTokens: 1_500,
    timeoutMs: 22_000,
    deadlineMs: 35_000,
    check: (raw, final) => checkBriefing(raw, input, final),
  });
  return normalizeBriefing(output, input, model);
}
