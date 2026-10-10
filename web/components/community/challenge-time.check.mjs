// Self-check for challenge-time. Run from web/: node components/community/challenge-time.check.mjs
import assert from 'node:assert/strict';
import { acceptsEntries, closesIn } from './challenge-time.mjs';

const now = Date.parse('2026-10-09T12:00:00Z');
const at = (ms) => new Date(now + ms).toISOString();
const H = 3_600_000;

assert.equal(closesIn(at(3 * 24 * H + H), now), 'Closes in 3 days');
assert.equal(closesIn(at(24 * H), now), 'Closes in 1 day');
assert.equal(closesIn(at(5 * H), now), 'Closes in 5 hours');
assert.equal(closesIn(at(20 * 60_000), now), 'Closes in 20 minutes');
assert.equal(closesIn(at(30_000), now), 'Closing now');
assert.equal(closesIn(at(-1), now), 'Closed');
assert.equal(closesIn('not a date', now), 'Closed');

assert.equal(acceptsEntries({ status: 'open', dueAt: at(H) }, now), true);
assert.equal(acceptsEntries({ status: 'open', dueAt: at(-H) }, now), false); // past due, not closed yet
assert.equal(acceptsEntries({ status: 'closed', dueAt: at(H) }, now), false);
console.log('challenge-time ok');
