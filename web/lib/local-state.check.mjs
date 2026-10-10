// Self-check for lib/local-state.ts. Run from web/: node lib/local-state.check.mjs (Node 24 strips the types).
import assert from 'node:assert/strict';

const data = new Map();
globalThis.window = {
  localStorage: {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    removeItem: (k) => data.delete(k),
  },
};

const s = await import('./local-state.ts');

// Every key is fo:-prefixed.
for (const key of Object.values(s.LOCAL_KEYS)) assert.ok(key.startsWith('fo:'), key);

// Consent: someone who accepted under the old key is not asked again, and the old key is moved over.
assert.equal(s.hasConsent(), false);
data.set('fo:cookie-notice', 'seen');
assert.equal(s.hasConsent(), true);
assert.equal(data.has('fo:cookie-notice'), false);
assert.equal(JSON.parse(data.get('fo:consent')).essential, true);
assert.equal(s.hasConsent(), true);

// Popups: a list of ids, no duplicates; junk is ignored.
data.set('fo:popups', '{not json');
assert.equal(s.isPopupDismissed('a'), false);
s.dismissPopup('a');
s.dismissPopup('a');
s.dismissPopup('b');
assert.deepEqual(JSON.parse(data.get('fo:popups')), ['a', 'b']);
assert.equal(s.isPopupDismissed('b'), true);

// Auth hint: role and time only, cleared on sign-out.
s.setAuthHint('fan');
const hint = JSON.parse(data.get('fo:auth'));
assert.deepEqual(Object.keys(hint).sort(), ['at', 'role', 'signedIn']);
assert.equal(hint.role, 'fan');
s.clearAuthHint();
assert.equal(data.has('fo:auth'), false);

// Storage that throws never breaks a caller.
globalThis.window = {
  get localStorage() {
    throw new Error('blocked');
  },
};
assert.equal(s.getLocal('auth'), null);
s.setAuthHint('creator');
s.clearAuthHint();
assert.equal(s.hasConsent(), false);

console.log('local-state ok');
