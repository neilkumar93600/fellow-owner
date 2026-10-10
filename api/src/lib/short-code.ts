import { randomInt } from 'node:crypto';
import { LIMITS } from '@fellow-owners/shared';

export const BASE62_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

const SHORT_CODE_PATTERN = new RegExp(`^[0-9A-Za-z]{${LIMITS.promotion.shortCodeLength}}$`);

/** Crypto-random base62 code (8 chars by default: 62^8 ~ 2.2e14 codes). */
export function generateShortCode(length: number = LIMITS.promotion.shortCodeLength): string {
  let code = '';
  for (let i = 0; i < length; i += 1) code += BASE62_ALPHABET[randomInt(BASE62_ALPHABET.length)];
  return code;
}

export function isShortCode(value: string): boolean {
  return SHORT_CODE_PATTERN.test(value);
}

/**
 * Generates a code that `isTaken` reports as free. Collisions are astronomically rare; the loop
 * only guards against them (promotions.short_code is also unique in the database).
 */
export async function generateUniqueShortCode(
  isTaken: (code: string) => Promise<boolean>,
  attempts = 5,
): Promise<string> {
  for (let i = 0; i < attempts; i += 1) {
    const code = generateShortCode();
    if (!(await isTaken(code))) return code;
  }
  throw new Error('Could not generate a unique short code');
}
