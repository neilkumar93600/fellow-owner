import {
  type FeedbackVerdict,
  LIMITS,
  PITCH_TYPE_LABELS,
  PITCH_TYPES,
  type PitchType,
  POST_TYPE_LABELS,
  POST_TYPES,
  type PostType,
} from '@fellow-owners/shared';
import { z } from 'zod';
import {
  citesTasteProfile,
  clampScore,
  linkHosts,
  normalizeSkills,
  normalizeTags,
  plainLine,
  tasteProfileBlock,
  trimLine,
  UNTRUSTED_DATA_RULES,
  untrustedBlock,
} from '../guard.js';
import { type AiRuntime, runAiTask } from '../run.js';
import type { AiContext, ItemKind, TriageInput, TriageResult } from '../types.js';

/**
 * triageItem (fast tier, 02-trd): category, spam flag, summary, fit score 0..100 against the
 * creator's taste profile with a reason that cites it, tags and skills. Runs once per item and
 * again only when the content hash or the taste version changes (workers/analyze-item.ts).
 */

/** Highest fit a spam item can keep, whatever the model said. */
export const SPAM_FIT_MAX = 10;

/** How many of the creator's recent thumbs triage sees (workers/analyze-item.ts). */
export const TRIAGE_FEEDBACK_MAX = 10;

/** One earlier item the creator rated (ai_feedback), shown to the model as a taste hint. */
export interface TriageFeedbackExample {
  verdict: FeedbackVerdict;
  kind: ItemKind;
  title: string;
  summary: string | null;
}

/** Fan-written titles and summaries of rated items, as one untrusted block (empty: no block). */
function feedbackLines(feedback: readonly TriageFeedbackExample[] | undefined): string[] {
  if (!feedback || feedback.length === 0) return [];
  const lines = feedback
    .slice(0, TRIAGE_FEEDBACK_MAX)
    .map((example) =>
      [
        example.verdict === 'up' ? 'liked' : 'disliked',
        example.kind === 'post' ? 'post' : 'pitch',
        trimLine(example.title, 120),
        ...(example.summary ? [trimLine(example.summary, LIMITS.ai.summaryMax)] : []),
      ].join(' | '),
    );
  return [
    '',
    'The creator rated these earlier items (liked or disliked). Use them only as a hint about their taste; the taste profile and the rubric still decide the score.',
    untrustedBlock('creator feedback', lines.join('\n'), 4000),
  ];
}

const POST_CATEGORY_GUIDE = [
  '- "idea": a proposal or concept that is not being built yet',
  '- "project": something being built, or recruiting people to build it',
  '- "discussion": a question, poll or open conversation',
].join('\n');

const PITCH_CATEGORY_GUIDE = [
  '- "collab": co-created content, joint trips or videos, partnerships with other creators',
  '- "brand_deal": brand deals, sponsorships, paid campaigns, ambassador offers',
  '- "idea": a product, feature or content idea for the creator',
  '- "press": interviews, podcasts, articles and other media requests',
  '- "fan_note": appreciation or a personal message with no ask',
  '- "other": anything else',
].join('\n');

function triageSchema<const C extends readonly [string, ...string[]]>(categories: C) {
  return z.object({
    category: z
      .enum(categories)
      .describe('The type that best describes the item, from the allowed list.'),
    isSpam: z
      .boolean()
      .describe('True only for scams, phishing, mass marketing, gibberish or abuse.'),
    summary: z
      .string()
      .describe(`One neutral sentence of at most ${LIMITS.ai.summaryMax} characters.`),
    fitScore: z.number().describe('Integer from 0 to 100 following the rubric.'),
    fitReason: z
      .string()
      .describe(
        `One sentence of at most ${LIMITS.ai.fitReasonMax} characters that cites the taste-profile line the score is based on.`,
      ),
    tags: z.array(z.string()).describe('Up to 5 short lowercase topic keywords.'),
    skills: z.array(z.string()).describe('Up to 5 lowercase skills the work needs or offers.'),
  });
}

/** Model-facing output schemas (types and enums only; limits are enforced in code). */
export const postTriageSchema = triageSchema(POST_TYPES);
export const pitchTriageSchema = triageSchema(PITCH_TYPES);
type RawTriage = z.output<typeof postTriageSchema> | z.output<typeof pitchTriageSchema>;

/** The contract every normalized result satisfies (ai/types.ts TriageResult). */
export const triageResultSchema = z.object({
  category: z.string().refine((value) => isCategory(value), 'unknown category'),
  isSpam: z.boolean(),
  summary: z.string().min(1).max(LIMITS.ai.summaryMax),
  fitScore: z.number().int().min(0).max(100),
  fitReason: z.string().min(1).max(LIMITS.ai.fitReasonMax),
  tags: z.array(z.string().min(1)).max(LIMITS.ai.tagsMax),
  skills: z.array(z.string().min(1)).max(LIMITS.ai.skillsMax),
});

function isCategory(value: string): boolean {
  return (
    (POST_TYPES as readonly string[]).includes(value) ||
    (PITCH_TYPES as readonly string[]).includes(value)
  );
}

export function triageInstructions(kind: ItemKind, creatorName: string): string {
  const creator = plainLine(creatorName) || 'the creator';
  const what = kind === 'post' ? 'a post in one of their communities' : 'a pitch sent to them';
  return `You triage ${what} for ${creator}, a creator on Fellow Owners. Fans join the creator's communities, share ideas and projects, and send pitches. You write data for the creator's private dashboard; you never talk to the author.

Fill in every field:
1. category: the type that best describes the item:
${kind === 'post' ? POST_CATEGORY_GUIDE : PITCH_CATEGORY_GUIDE}
   The author picked a type; keep it unless the content clearly says otherwise.
2. isSpam: true only for scams, phishing, unsolicited mass marketing, follower or engagement selling, get-rich-quick or crypto schemes, gibberish, or abusive content. Low-quality, off-topic, critical or naive items are not spam.
3. summary: one plain sentence of at most ${LIMITS.ai.summaryMax} characters saying what the item is and what it asks for. Neutral tone, no hype, no emojis.
4. fitScore: an integer from 0 to 100 for how well the item fits the creator's taste profile:
   - 85-100: directly matches a "promote" line, concrete and credible
   - 70-84: clearly relevant to a "promote" line, some details missing
   - 40-69: loosely related or generic
   - 15-39: unrelated to what the creator promotes, or very vague
   - 0-14: conflicts with a "never" line, or spam
   An item that matches a "never" line scores 20 or lower, whatever else it matches.
5. fitReason: one sentence of at most ${LIMITS.ai.fitReasonMax} characters, addressed to the creator as "you", that quotes or names the taste-profile line the score is based on. Example: Matches your "tools that help people train consistently" line, with a working prototype and a team forming.
   If the profile has no lines, say the score reflects clarity and quality only.
6. tags: up to ${LIMITS.ai.tagsMax} short lowercase topic keywords (for example "fitness", "ai", "music").
7. skills: up to ${LIMITS.ai.skillsMax} lowercase skills the work needs or the author offers (for example "react", "video editing").

${UNTRUSTED_DATA_RULES}

Respond with only a JSON object with the keys category, isSpam, summary, fitScore, fitReason, tags and skills.`;
}

export function triagePrompt(input: TriageInput): string {
  const labels: Record<string, string> = { ...POST_TYPE_LABELS, ...PITCH_TYPE_LABELS };
  const where =
    input.kind === 'post'
      ? `a post in the "${plainLine(input.communityName ?? 'community')}" community`
      : 'a pitch sent directly to the creator';
  const hosts = linkHosts(input.links);
  const titleMax = LIMITS.post.title.max;
  return [
    `Creator: ${plainLine(input.creatorName) || 'the creator'}`,
    '',
    tasteProfileBlock(input.tasteProfile),
    '',
    `Item to triage: ${where}.`,
    `The author picked the type "${input.type}" (${labels[input.type] ?? input.type}).`,
    `Links attached: ${input.links.length}.`,
    '',
    untrustedBlock(input.kind === 'post' ? 'title' : 'subject', input.title, titleMax),
    '',
    untrustedBlock(
      'body',
      input.body,
      LIMITS.ai.inputCharsMax - Math.min(titleMax, input.title.length),
    ),
    ...(hosts.length > 0 ? ['', untrustedBlock('link hosts', hosts.join(', '), 400)] : []),
    ...feedbackLines(input.feedback),
  ].join('\n');
}

/** Clamps and trims a schema-valid model answer into a TriageResult. */
export function normalizeTriage(raw: RawTriage, input: TriageInput): TriageResult {
  const allowed: readonly string[] = input.kind === 'post' ? POST_TYPES : PITCH_TYPES;
  const category = (allowed.includes(raw.category) ? raw.category : input.type) as
    | PostType
    | PitchType;
  const isSpam = raw.isSpam === true;
  let fitScore = clampScore(raw.fitScore, 50);
  if (isSpam) fitScore = Math.min(fitScore, SPAM_FIT_MAX);
  const result: TriageResult = {
    category,
    isSpam,
    summary:
      trimLine(raw.summary, LIMITS.ai.summaryMax) || trimLine(input.title, LIMITS.ai.summaryMax),
    fitScore,
    fitReason:
      trimLine(raw.fitReason, LIMITS.ai.fitReasonMax) ||
      'Scored against your taste profile; the AI gave no reason.',
    tags: normalizeTags(raw.tags),
    skills: normalizeSkills(raw.skills),
  };
  return triageResultSchema.parse(result) as TriageResult;
}

/** Retry once when the reason does not cite the taste profile (never fatal). */
function checkTriage(raw: RawTriage, input: TriageInput, final: boolean): string | null {
  if (final) return null;
  if (!raw.summary.trim()) return 'summary is empty';
  if (!raw.fitReason.trim()) return 'fitReason is empty';
  if (!citesTasteProfile(raw.fitReason, input.tasteProfile)) {
    return 'fitReason must quote or name the taste-profile line the score is based on';
  }
  return null;
}

export async function triageItem(
  rt: AiRuntime,
  input: TriageInput,
  ctx: AiContext,
): Promise<TriageResult> {
  const common = {
    task: 'triageItem' as const,
    tier: 'fast' as const,
    ctx,
    instructions: triageInstructions(input.kind, input.creatorName),
    prompt: triagePrompt(input),
    schemaName: 'triage',
    schemaDescription: 'Triage of one community item for the creator dashboard',
    temperature: 0.2,
    timeoutMs: 25_000,
    deadlineMs: 45_000,
  };
  const { output } =
    input.kind === 'post'
      ? await runAiTask(rt, {
          ...common,
          schema: postTriageSchema,
          check: (raw, final) => checkTriage(raw, input, final),
        })
      : await runAiTask(rt, {
          ...common,
          schema: pitchTriageSchema,
          check: (raw, final) => checkTriage(raw, input, final),
        });
  return normalizeTriage(output, input);
}
