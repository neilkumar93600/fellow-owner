// Self-check for match-label-core. Run from web/: node components/shared/match-label.check.mjs
import assert from 'node:assert/strict';
import { MATCH_LABELS, matchTier } from './match-label-core.mjs';

assert.equal(matchTier(94), 'strong');
assert.equal(matchTier(80), 'strong');
assert.equal(matchTier(79), 'worth');
assert.equal(matchTier(60), 'worth');
assert.equal(matchTier(59), 'not');
assert.equal(matchTier(null), null);
assert.equal(matchTier(undefined), null);
assert.equal(MATCH_LABELS.strong, 'Strong match');
assert.equal(MATCH_LABELS.worth, 'Worth a look');
assert.equal(MATCH_LABELS.not, 'Not for you');
console.log('match-label ok');
