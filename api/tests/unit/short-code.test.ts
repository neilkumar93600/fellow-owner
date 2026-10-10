import { describe, expect, it, vi } from 'vitest';
import {
  BASE62_ALPHABET,
  generateShortCode,
  generateUniqueShortCode,
  isShortCode,
} from '../../src/lib/short-code.js';

describe('short codes', () => {
  it('are 8 base62 characters', () => {
    for (let i = 0; i < 200; i += 1) {
      const code = generateShortCode();
      expect(code).toHaveLength(8);
      expect([...code].every((char) => BASE62_ALPHABET.includes(char))).toBe(true);
      expect(isShortCode(code)).toBe(true);
    }
  });

  it('do not repeat in practice', () => {
    const codes = new Set(Array.from({ length: 5000 }, () => generateShortCode()));
    expect(codes.size).toBe(5000);
  });

  it('rejects malformed codes', () => {
    expect(isShortCode('abc')).toBe(false);
    expect(isShortCode('abcd-fgh')).toBe(false);
  });

  it('retries until a free code is found', async () => {
    const isTaken = vi.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    const code = await generateUniqueShortCode(isTaken);
    expect(isShortCode(code)).toBe(true);
    expect(isTaken).toHaveBeenCalledTimes(2);
  });

  it('gives up after the attempt limit', async () => {
    await expect(generateUniqueShortCode(async () => true, 3)).rejects.toThrow();
  });
});
