// Self-check for lib/format.ts. Run from web/: node lib/format.check.mjs (Node 24 strips the types).
import assert from 'node:assert/strict';
import {
  formatChange,
  formatCompact,
  formatDate,
  formatNumber,
  formatRelative,
  pluralize,
} from './format.ts';

assert.equal(formatNumber(1200), '1,200');
assert.equal(formatCompact(9999), '9,999');
assert.equal(formatCompact(10_000), '10k');
assert.equal(formatCompact(12_500), '12.5k');
assert.equal(formatCompact(999_949), '999.9k');
assert.equal(formatCompact(999_950), '1M');
assert.equal(formatCompact(1_250_000), '1.3M');

assert.deepEqual(formatChange(18.4), { text: '+18%', direction: 'up' });
assert.deepEqual(formatChange(-4.2), { text: '−4%', direction: 'down' });
assert.deepEqual(formatChange(0.4), { text: '0%', direction: 'flat' });
assert.deepEqual(formatChange(null), { text: '0%', direction: 'flat' });
assert.deepEqual(formatChange(1234), { text: '+1,234%', direction: 'up' });

const now = new Date(2026, 9, 2, 12, 0).getTime();
const ago = (ms) => new Date(now - ms).toISOString();
assert.equal(formatRelative(ago(30_000), now), 'just now');
assert.equal(formatRelative(ago(-20_000), now), 'just now');
assert.equal(formatRelative(ago(5 * 60_000), now), '5m ago');
assert.equal(formatRelative(ago(3 * 3_600_000), now), '3h ago');
assert.equal(formatRelative(ago(2 * 86_400_000), now), '2d ago');
assert.equal(formatRelative(ago(10 * 86_400_000), now), 'Sep 22');
assert.equal(formatDate(new Date(2025, 9, 2).toISOString(), now), 'Oct 2, 2025');
assert.equal(formatRelative('not a date', now), '');

assert.equal(pluralize(1, 'member'), 'member');
assert.equal(pluralize(0, 'member'), 'members');
assert.equal(pluralize(2, 'pitch'), 'pitches');
assert.equal(pluralize(5, 'community'), 'communities');
assert.equal(pluralize(2, 'person', 'people'), 'people');

console.log('format: ok');
