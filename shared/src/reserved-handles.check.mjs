// Self-check for reserved-handles.ts. Run from the repo root: node shared/src/reserved-handles.check.mjs
import assert from 'node:assert/strict';
import { isReservedHandle } from './reserved-handles.ts';

// Every top-level web route is reserved, so /{handle} can never shadow one (start: the Get started target).
for (const route of ['start', 'login', 'create-account', 'sign-out', 'onboarding', 'dashboard']) {
  assert.equal(isReservedHandle(route), true, route);
}
assert.equal(isReservedHandle('  Start '), true);
assert.equal(isReservedHandle('mira'), false);
console.log('reserved-handles ok');
