import { COACH_KEYS, COACH_LABELS, COACH_TIPS, lengthCheck } from '../tasks/coach.js';
import type { CoachInput, CoachOutput } from '../types.js';

/** What each check looks for in the draft; the first match is quoted back. */
const PATTERNS: Record<string, RegExp> = {
  audience:
    /\b(fans?|viewers?|audience|community|members?|followers?|subscribers?|readers?|travell?ers?|beginners?|people who|anyone who)\b/i,
  ask: /\b(could you|can you|would you|will you|i(?:'|’)d love|i would love|i want|i(?:'|’)m asking|asking (?:you|for)|pin|feature|collab|invite|join)\b|\?/i,
  proof: /https?:\/\/\S+|\bwww\.\S+|\$\s?\d|\b\d{2,}\b|\bso far\b|\bfor example\b/i,
  problem:
    /\b(problem|struggle|hard to|difficult|nobody|no one|can(?:'|’)t|cannot|tired of|keep (?:asking|missing)|fade|waste|frustrat\w*|wish)\b/i,
  help: /\b(i need|we need|looking for|help with|volunteers?|illustrator|designer|editor|photographer|host|guide|role|spots?)\b/i,
  next: /\b(first step|next step|to start|trial|this week|next week|monday|tomorrow|by (?:the end|friday)|i(?:'|’)ll try|i will try|plan to)\b/i,
};

/** A short quote around the match: up to 8 words, starting at the match. */
function quoteAround(text: string, match: RegExpMatchArray): string {
  const from = match.index ?? 0;
  const words = text.slice(from).replace(/\s+/g, ' ').trim().split(' ').slice(0, 8).join(' ');
  return words.replace(/[.,;:!?]+$/, '');
}

/**
 * Deterministic Idea Coach for tests and keyless dev: keyword rules stand in for the model, the
 * length check is the same code the live task uses. Clarity only: no score, no prediction, no
 * rewrite (the live task offers one).
 */
export function fakeCoach(input: CoachInput): CoachOutput {
  const text = `${input.subject}\n${input.body}`;
  const checks = COACH_KEYS[input.kind].map((key) => {
    if (key === 'length') return lengthCheck(input.body);
    const match = PATTERNS[key] ? text.match(PATTERNS[key]) : null;
    return {
      key,
      label: COACH_LABELS[key] ?? key,
      ok: match !== null,
      found: match ? quoteAround(text, match) : null,
      tip: match ? null : (COACH_TIPS[key] ?? null),
    };
  });
  return { checks, suggestion: null };
}
