// Self-check for countdown-core. Run from web/: node components/dashboard/challenges/countdown.check.mjs
import assert from 'node:assert/strict';
import { countdown } from './countdown-core.mjs';

const now = Date.UTC(2026, 9, 9, 12, 0, 0);
const at = (ms) => new Date(now + ms).toISOString();

assert.deepEqual(countdown(at(5 * 864e5 + 1000), now), {
  text: '5 days left',
  urgent: false,
  past: false,
});
assert.equal(countdown(at(864e5), now).text, '1 day left');
assert.deepEqual(countdown(at(3 * 36e5), now), { text: '3 hours left', urgent: true, past: false });
assert.equal(countdown(at(36e5), now).text, '1 hour left');
assert.equal(countdown(at(12 * 6e4), now).text, '12 minutes left');
assert.equal(countdown(at(5000), now).text, '1 minute left');
assert.deepEqual(countdown(at(-1000), now), { text: 'Past due', urgent: true, past: true });
assert.equal(countdown('nope', now).text, '');
console.log('countdown ok');
