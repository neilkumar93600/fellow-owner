// Self-check for creator-image-core. Run from web/: node components/shared/creator-image.check.mjs
import assert from 'node:assert/strict';
import { imageMode } from './creator-image-core.mjs';

assert.equal(imageMode({ ready: false }), 'placeholder'); // missing file never renders <img>
assert.equal(imageMode({ ready: true }), 'image');
assert.equal(imageMode(undefined), 'placeholder'); // unknown asset name
console.log('creator-image ok');
