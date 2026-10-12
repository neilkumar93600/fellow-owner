import { BRAND_LIMITS, type BrandFlag } from '@fellow-owners/shared';
import { clampScore, trimLine } from '../guard.js';
import type { BrandTriageAiInput, BrandTriageAiOutput } from '../tasks/brand-triage.js';

const FLAG_PATTERNS: Array<[BrandFlag, RegExp]> = [
  ['free_product_only', /\b(free product|gifted|in exchange for|product seeding|no budget)\b/i],
  ['payment_upfront', /\b(registration fee|pay (a|the) fee|deposit|pay upfront|processing fee)\b/i],
  ['suspicious_link', /\b(bit\.ly|tinyurl|t\.me|wa\.me|telegram|whatsapp)\b/i],
  ['urgent', /\b(asap|urgent|this week|tomorrow|by friday|right away)\b/i],
];

const BUDGET_POINTS: Record<string, number> = {
  under_500: 5,
  '500_2000': 10,
  '2000_5000': 15,
  '5000_10000': 20,
  '10000_plus': 20,
};

/** Flags that say "be careful", each worth -25. */
const RED_FLAGS: readonly BrandFlag[] = ['payment_upfront', 'suspicious_link', 'free_product_only'];

const wordsOf = (text: string) => new Set(text.toLowerCase().match(/[a-z0-9]{4,}/g) ?? []);

/**
 * Deterministic brand triage for tests and keyless dev: 50, +15 with a website, +5 to +20 by
 * budget, +10 per "promote" line sharing a word, -30 per "never" line sharing one, -25 per red flag.
 */
export function fakeBrandTriage(input: BrandTriageAiInput): BrandTriageAiOutput {
  const { request, tasteProfile } = input;
  const text = [request.subject, request.deliverables, request.message].filter(Boolean).join('\n');
  const flags = new Set<BrandFlag>();
  for (const [flag, pattern] of FLAG_PATTERNS) if (pattern.test(text)) flags.add(flag);
  if (!request.website) flags.add('no_website');
  if (!request.budgetRange || request.budgetRange === 'not_sure') flags.add('budget_missing');

  const words = wordsOf(text);
  const matching = (lines: readonly string[]) =>
    lines.filter((line) => [...wordsOf(line)].some((word) => words.has(word))).length;
  const never = matching(tasteProfile.never);
  if (never > 0) flags.add('off_brand');

  const score =
    50 +
    (request.website ? 15 : 0) +
    (BUDGET_POINTS[request.budgetRange ?? ''] ?? 0) +
    10 * matching(tasteProfile.promote) -
    30 * never -
    25 * RED_FLAGS.filter((flag) => flags.has(flag)).length;

  const first = request.message
    .replace(/\s+/g, ' ')
    .trim()
    .match(/^(.+?[.!?])(\s|$)/)?.[1];
  return {
    score: clampScore(score, 50),
    summary: trimLine(`${request.brandName}: ${first ?? request.message}`, BRAND_LIMITS.summaryMax),
    flags: [...flags],
    urgency: flags.has('urgent') ? 'high' : 'normal',
    model: 'fake',
  };
}
