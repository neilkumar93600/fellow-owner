// Pure match-tier logic, shared by match-label.tsx and its node check (match-label.check.mjs).

/** @typedef {'strong' | 'worth' | 'not'} MatchTier */

/** @type {Record<MatchTier, string>} */
export const MATCH_LABELS = {
  strong: 'Strong match',
  worth: 'Worth a look',
  not: 'Not for you',
};

/**
 * A 0 to 100 match score as a tier: 80 and up strong, 60 to 79 worth a look, under 60 not for you.
 * @param {number | null | undefined} score
 * @returns {MatchTier | null}
 */
export function matchTier(score) {
  if (score == null || Number.isNaN(score)) return null;
  if (score >= 80) return 'strong';
  if (score >= 60) return 'worth';
  return 'not';
}
