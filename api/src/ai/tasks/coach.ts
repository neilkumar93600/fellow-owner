import { LIMITS } from '@fellow-owners/shared';
import { z } from 'zod';
import {
  containsContactDetails,
  plainLine,
  trimLine,
  trimText,
  UNTRUSTED_DATA_RULES,
  unsupportedClaims,
  untrustedBlock,
} from '../guard.js';
import { type AiRuntime, runAiTask } from '../run.js';
import type { AiContext, CoachInput, CoachOutput } from '../types.js';

/**
 * F30 Idea Coach (fast tier): a clarity checklist and an optional rewrite for a pitch or post
 * draft the fan is still writing. It judges whether the draft is clear, never whether the creator
 * would like it: no score, no prediction, nothing about the creator's taste.
 * Route: POST /api/spaces/:handle/coach (LIMITS.coach.perDay per user, budget-exempt).
 */

export const COACH_KEYS = {
  pitch: ['audience', 'ask', 'proof', 'length'],
  post: ['problem', 'audience', 'help', 'next'],
} as const;

export const COACH_LABELS: Record<string, string> = {
  audience: 'Who it’s for',
  ask: 'What you’re asking for',
  proof: 'Proof or a link',
  length: 'Quick to read',
  problem: 'The problem',
  help: 'What help you need',
  next: 'A first step',
};

/** What each key looks for, for the prompt, the fake's tips and the generic fallbacks. */
export const COACH_TIPS: Record<string, string> = {
  audience: 'Say who this is for, such as the kind of fan it helps.',
  ask: 'Say what you are asking the creator to do.',
  proof: 'Add a link, a photo or a number that shows it is real.',
  length: 'Aim for a draft that reads in under a minute.',
  problem: 'Say the problem in one sentence before the idea.',
  help: 'Name one role or kind of help you need.',
  next: 'Say what you will try first, and by when.',
};

const LENGTH_LABEL = COACH_LABELS.length ?? 'Quick to read';
const WORDS_PER_SECOND = 4;
const LENGTH_OK_WORDS = { min: 25, max: 250 };

/** The length check is counted in code (the model never judges it). */
export function lengthCheck(body: string): CoachOutput['checks'][number] {
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  const seconds = Math.max(5, Math.round(words / WORDS_PER_SECOND / 5) * 5);
  const reading =
    seconds >= 60 ? `About ${Math.round(seconds / 60)} min` : `About ${seconds} seconds`;
  const label = LENGTH_LABEL;
  if (words < LENGTH_OK_WORDS.min) {
    return {
      key: 'length',
      label,
      ok: false,
      found: null,
      tip: 'A few more sentences will help: why it matters and what happens next.',
    };
  }
  if (words > LENGTH_OK_WORDS.max) {
    return {
      key: 'length',
      label,
      ok: false,
      found: null,
      tip: `This reads in ${reading.toLowerCase()}. Trim it to the one idea that matters most.`,
    };
  }
  return { key: 'length', label, ok: true, found: reading, tip: null };
}

/** Keys the model judges (the pitch's length is counted in code). */
function modelKeys(kind: CoachInput['kind']): readonly string[] {
  return COACH_KEYS[kind].filter((key) => key !== 'length');
}

export const coachSchema = z.object({
  checks: z.array(
    z.object({
      key: z.string().describe('One of the keys listed in the rules.'),
      ok: z.boolean().describe('True when the draft already covers this.'),
      found: z
        .string()
        .describe('A short quote from the draft when ok, otherwise an empty string.'),
      tip: z.string().describe('One plain sentence on what to add when not ok, otherwise empty.'),
    }),
  ),
  suggestionSubject: z.string().describe('A clearer subject or title, or an empty string.'),
  suggestionBody: z.string().describe('A clearer version of the draft, or an empty string.'),
});

type CoachRaw = z.output<typeof coachSchema>;

export function coachInstructions(input: CoachInput): string {
  const creator = plainLine(input.creatorName) || 'the creator';
  const what =
    input.kind === 'pitch' ? 'an idea they want to send to' : 'an Idea or Project post for';
  const keys = modelKeys(input.kind)
    .map((key) => `- ${key}: ${COACH_LABELS[key]}. ${COACH_TIPS[key]}`)
    .join('\n');
  return `You are the Idea Coach on Fellow Owners. A fan is writing ${what} ${creator}'s community and asks whether the draft is clear. You check the writing, not the idea's appeal.

Check these keys, one entry each, in this order:
${keys}

For each key:
- ok is true only when the draft already covers it. Then "found" is a short quote or paraphrase from the draft (at most 12 words) and "tip" is an empty string.
- Otherwise ok is false, "found" is an empty string and "tip" is one plain sentence (at most 25 words) saying what to add.

Suggested version: only when at least one key is not ok, rewrite the draft more clearly in the fan's own voice (first person, plain words, same length or shorter). Use only facts already in the draft: never add numbers, names, links or promises, and never add placeholders. Leave "suggestionSubject" and "suggestionBody" as empty strings when the draft needs no rewrite.

Hard rules:
- Judge clarity only. Never give a score, a rating or a grade. Never predict whether ${creator} will like, accept, reply to or share it. Never talk about ${creator}'s taste, preferences, past decisions or what they promote.
- Plain language, no markdown, no emoji.

${UNTRUSTED_DATA_RULES}

Respond with only a JSON object: {"checks": [{"key": "...", "ok": true, "found": "...", "tip": "..."}], "suggestionSubject": "...", "suggestionBody": "..."}.`;
}

export function coachPrompt(input: CoachInput): string {
  const source = input.kind === 'pitch' ? 'pitch' : 'post';
  const draft = input.subject.trim()
    ? `Subject: ${input.subject}\n\n${input.body}`
    : `${input.body}`;
  return [
    `The draft ${source} to check:`,
    untrustedBlock(source, draft, LIMITS.ai.inputCharsMax),
  ].join('\n');
}

/** Words that turn clarity advice into a verdict. Tips containing one are rejected. */
const VERDICT =
  /\b(score|rating|grade|chances?|likely to|will (?:like|love|accept|reject|reply|say)|would (?:like|love|accept|reject))\b|\b\d+\s*\/\s*(?:10|100)\b|\b\d+\s*out of\s*(?:10|100)\b/i;

function rawProblem(raw: CoachRaw, input: CoachInput): string | null {
  const wanted = modelKeys(input.kind);
  const byKey = new Map(raw.checks.map((check) => [check.key.trim().toLowerCase(), check]));
  const missing = wanted.filter((key) => !byKey.has(key));
  if (missing.length > 0) return `missing checks for: ${missing.join(', ')}`;
  for (const key of wanted) {
    const check = byKey.get(key);
    if (!check) continue;
    if (!check.ok && !plainLine(check.tip)) return `the "${key}" check is not ok but has no tip`;
    if (VERDICT.test(check.tip)) {
      return `the "${key}" check gives a score or predicts a reaction; judge clarity only`;
    }
  }
  return null;
}

/** The rewrite, or null when absent or when it adds facts, links or contact details. */
function usableSuggestion(raw: CoachRaw, input: CoachInput): CoachOutput['suggestion'] {
  const limits =
    input.kind === 'pitch'
      ? { subject: LIMITS.pitch.subject.max, body: LIMITS.pitch.body.max }
      : { subject: LIMITS.post.title.max, body: LIMITS.post.body.max };
  const body = trimText(raw.suggestionBody, limits.body);
  if (!body) return null;
  const subject =
    trimLine(raw.suggestionSubject, limits.subject) || trimLine(input.subject, limits.subject);
  const source = `${input.subject}\n${input.body}`;
  const text = `${subject}\n${body}`;
  if (unsupportedClaims(text, source).length > 0) return null;
  if (containsContactDetails(text) && !containsContactDetails(source)) return null;
  if (VERDICT.test(text) && !VERDICT.test(source)) return null;
  return { subject, body };
}

export async function coach(
  rt: AiRuntime,
  input: CoachInput,
  ctx: AiContext,
): Promise<CoachOutput> {
  const { output } = await runAiTask(rt, {
    task: 'coach',
    tier: 'fast',
    ctx,
    instructions: coachInstructions(input),
    prompt: coachPrompt(input),
    schema: coachSchema,
    schemaName: 'coach_checks',
    temperature: 0.3,
    maxOutputTokens: 1_200,
    timeoutMs: 12_000,
    deadlineMs: 18_000,
    check: (raw) => rawProblem(raw, input),
  });

  const byKey = new Map(output.checks.map((check) => [check.key.trim().toLowerCase(), check]));
  const checks: CoachOutput['checks'] = COACH_KEYS[input.kind].map((key) => {
    if (key === 'length') return lengthCheck(input.body);
    const item = byKey.get(key);
    const found = item?.ok ? trimLine(item.found, 80) : '';
    return {
      key,
      label: COACH_LABELS[key] ?? key,
      ok: Boolean(item?.ok),
      found: found || null,
      tip: item?.ok ? null : trimLine(item?.tip ?? '', 200) || COACH_TIPS[key] || null,
    };
  });
  return { checks, suggestion: usableSuggestion(output, input) };
}
