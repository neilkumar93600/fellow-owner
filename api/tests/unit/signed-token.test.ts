import { afterEach, describe, expect, it, vi } from 'vitest';
import { signToken, verifyToken } from '../../src/lib/signed-token.js';

const SECRET = 'test-secret-0123456789abcdef';

describe('signed-token', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('round-trips the subject for the same purpose', () => {
    const token = signToken('newsletter-confirm', 'priya@example.com', SECRET);
    expect(verifyToken('newsletter-confirm', token, SECRET)).toBe('priya@example.com');
  });

  it('is url-safe', () => {
    const token = signToken('email-unsubscribe', 'user-1', SECRET, 3600);
    expect(token).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
  });

  it('rejects a token signed for another purpose', () => {
    const token = signToken('newsletter-confirm', 'priya@example.com', SECRET);
    expect(verifyToken('email-unsubscribe', token, SECRET)).toBeNull();
  });

  it('rejects a tampered payload or signature', () => {
    const token = signToken('newsletter-confirm', 'priya@example.com', SECRET);
    const [payload = '', signature = ''] = token.split('.');
    const forged = Buffer.from(
      JSON.stringify({ p: 'newsletter-confirm', s: 'mallory@example.com' }),
    ).toString('base64url');
    expect(verifyToken('newsletter-confirm', `${forged}.${signature}`, SECRET)).toBeNull();
    // The first character carries 6 signature bits (the last one partly padding).
    const flipped = `${signature.startsWith('A') ? 'B' : 'A'}${signature.slice(1)}`;
    expect(verifyToken('newsletter-confirm', `${payload}.${flipped}`, SECRET)).toBeNull();
    expect(verifyToken('newsletter-confirm', token, 'another-secret')).toBeNull();
  });

  it('rejects malformed input', () => {
    for (const bad of ['', 'abc', 'a.b.c', '.', 'x.y']) {
      expect(verifyToken('newsletter-confirm', bad, SECRET)).toBeNull();
    }
  });

  it('rejects an expired token', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-10T12:00:00Z'));
    const token = signToken('email-unsubscribe', 'user-1', SECRET, 60);
    expect(verifyToken('email-unsubscribe', token, SECRET)).toBe('user-1');
    vi.setSystemTime(new Date('2026-10-10T12:01:01Z'));
    expect(verifyToken('email-unsubscribe', token, SECRET)).toBeNull();
  });
});
