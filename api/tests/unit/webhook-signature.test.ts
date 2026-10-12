import type { Request } from 'express';
import { describe, expect, it } from 'vitest';
import { isAppError } from '../../src/lib/errors.js';
import { requireSignature, signBody } from '../../src/middlewares/webhook-signature.js';

const SECRET = 'a-webhook-secret-of-some-length-0123';
const BODY = Buffer.from('{"object":"instagram","entry":[]}');

function run(headers: Record<string, string>, rawBody: Buffer | undefined, secret = SECRET) {
  const req = {
    rawBody,
    get: (name: string) => headers[name.toLowerCase()],
  } as unknown as Request;
  let passed = false;
  try {
    requireSignature({ header: 'x-hub-signature-256', secret: () => secret, prefix: 'sha256=' })(
      req,
      {} as never,
      () => {
        passed = true;
      },
    );
  } catch (error) {
    expect(isAppError(error) && error.status).toBe(401);
  }
  return passed;
}

describe('requireSignature (webhook HMAC over the raw body)', () => {
  it('passes the exact body signed with the secret', () => {
    const signature = signBody(SECRET, BODY, 'sha256=');
    expect(signature).toMatch(/^sha256=[0-9a-f]{64}$/);
    expect(run({ 'x-hub-signature-256': signature }, BODY)).toBe(true);
    expect(
      run({ 'x-hub-signature-256': signature.toUpperCase().replace('SHA256', 'sha256') }, BODY),
    ).toBe(true);
  });

  it('refuses a changed body, another secret, a missing header, body or secret', () => {
    const signature = signBody(SECRET, BODY, 'sha256=');
    expect(run({ 'x-hub-signature-256': signature }, Buffer.from(`${BODY} `))).toBe(false);
    expect(run({ 'x-hub-signature-256': signBody('other', BODY, 'sha256=') }, BODY)).toBe(false);
    expect(run({}, BODY)).toBe(false);
    expect(run({ 'x-hub-signature-256': signature }, undefined)).toBe(false);
    expect(run({ 'x-hub-signature-256': signature }, BODY, '')).toBe(false);
  });
});
