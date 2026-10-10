import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Small HMAC-SHA256 tokens for links in emails (newsletter confirm, one-click unsubscribe).
 * Format: `base64url(json {p: purpose, s: subject, e?: expiry unix seconds}).base64url(hmac)`.
 * The purpose is inside the signed payload, so a token minted for one purpose never verifies for
 * another. No database row: a token is valid until it expires (or forever without a ttl).
 */

interface Payload {
  p: string;
  s: string;
  e?: number;
}

function sign(payload: string, secret: string): Buffer {
  return createHmac('sha256', secret).update(payload).digest();
}

export function signToken(
  purpose: string,
  subject: string,
  secret: string,
  ttlSeconds?: number,
): string {
  const body: Payload = { p: purpose, s: subject };
  if (ttlSeconds !== undefined) body.e = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = Buffer.from(JSON.stringify(body)).toString('base64url');
  return `${payload}.${sign(payload, secret).toString('base64url')}`;
}

/** The subject when the token is intact, for `purpose` and not expired; null otherwise. */
export function verifyToken(purpose: string, token: string, secret: string): string | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload = '', signature = ''] = parts;
  if (!payload || !signature) return null;

  const expected = sign(payload, secret);
  const given = Buffer.from(signature, 'base64url');
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;

  let body: Partial<Payload>;
  try {
    body = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (body.p !== purpose || typeof body.s !== 'string') return null;
  if (body.e !== undefined && (typeof body.e !== 'number' || body.e * 1000 < Date.now())) {
    return null;
  }
  return body.s;
}
