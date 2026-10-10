import {
  createAccountSchema,
  LIMITS,
  parseLoginIdentifier,
  passwordSchema,
  socialHandleSchema,
  usernameSchema,
} from '@fellow-owners/shared';
import { describe, expect, expectTypeOf, it } from 'vitest';
import type { AuthUser } from '../../src/auth/index.js';

// The shared rules /create-account and /login validate with. Better Auth checks usernames and the
// social profile with the same schemas (src/auth/index.ts), so these pin both sides.

describe('usernameSchema', () => {
  it('trims and lowercases', () => {
    expect(usernameSchema.parse('  Mira.K_99 ')).toBe('mira.k_99');
  });

  it('rejects reserved handles', () => {
    expect(usernameSchema.safeParse('dashboard').error?.issues[0]?.message).toBe(
      'That handle is reserved. Pick another.',
    );
    expect(usernameSchema.safeParse('Fellow.Owners').success).toBe(false);
    // Reserved too, and the hyphen already breaks the pattern.
    expect(usernameSchema.safeParse('create-account').success).toBe(false);
  });

  it('rejects characters and lengths outside the handle rules', () => {
    const tooLong = 'a'.repeat(LIMITS.username.max + 1);
    for (const bad of ['mira k', 'mira-k', 'mira@k', 'mïra', 'ab', '  ab  ', tooLong]) {
      expect(usernameSchema.safeParse(bad).success, bad).toBe(false);
    }
    expect(usernameSchema.safeParse('a'.repeat(LIMITS.username.max)).success).toBe(true);
    expect(usernameSchema.safeParse('abc').success).toBe(true);
  });

  it('follows the same rules as a space handle (one namespace)', () => {
    expect(LIMITS.username).toEqual(LIMITS.handle);
  });
});

describe('socialHandleSchema', () => {
  it('drops the leading @ and keeps the case', () => {
    expect(socialHandleSchema.parse('@mira.k')).toBe('mira.k');
    expect(socialHandleSchema.parse('  @@Mira_K-1 ')).toBe('Mira_K-1');
  });

  it('rejects spaces, an empty handle and handles that are too long', () => {
    const max = LIMITS.socialHandle.max;
    for (const bad of ['mira k', '@', '', 'mira/k', 'a'.repeat(max + 1)]) {
      expect(socialHandleSchema.safeParse(bad).success, bad).toBe(false);
    }
    expect(socialHandleSchema.safeParse(`@${'a'.repeat(max)}`).success).toBe(true);
  });
});

describe('passwordSchema', () => {
  it(`accepts ${LIMITS.password.min} to ${LIMITS.password.max} characters`, () => {
    const { min, max } = LIMITS.password;
    expect(passwordSchema.safeParse('a'.repeat(min - 1)).success).toBe(false);
    expect(passwordSchema.safeParse('a'.repeat(min)).success).toBe(true);
    expect(passwordSchema.safeParse('a'.repeat(max)).success).toBe(true);
    expect(passwordSchema.safeParse('a'.repeat(max + 1)).success).toBe(false);
  });
});

describe('parseLoginIdentifier', () => {
  it('reads anything with an @ past the first character as an email', () => {
    expect(parseLoginIdentifier(' Mira@Example.com ')).toEqual({
      kind: 'email',
      email: 'mira@example.com',
    });
  });

  it('reads a username, with or without the leading @', () => {
    expect(parseLoginIdentifier('Mira.K')).toEqual({ kind: 'username', username: 'mira.k' });
    expect(parseLoginIdentifier(' @mira.k')).toEqual({ kind: 'username', username: 'mira.k' });
  });
});

describe('createAccountSchema', () => {
  const base = {
    name: ' Mira Kapoor ',
    email: 'Mira@Example.com',
    username: 'Mira.K',
    password: 'correct-horse',
  };

  it('needs no social profile', () => {
    expect(createAccountSchema.parse(base)).toEqual({
      name: 'Mira Kapoor',
      email: 'mira@example.com',
      username: 'mira.k',
      password: 'correct-horse',
    });
  });

  it('checks the social profile when it is sent', () => {
    expect(
      createAccountSchema.parse({ ...base, socialPlatform: 'tiktok', socialHandle: '@mira.k' }),
    ).toMatchObject({ socialPlatform: 'tiktok', socialHandle: 'mira.k' });
    const badPlatform = { ...base, socialPlatform: 'myspace', socialHandle: 'mira' };
    expect(createAccountSchema.safeParse(badPlatform).success).toBe(false);
    const badHandle = { ...base, socialPlatform: 'instagram', socialHandle: 'mira k' };
    expect(createAccountSchema.safeParse(badHandle).success).toBe(false);
  });
});

describe('AuthUser', () => {
  // Compile-time only (tsc): the username plugin and user.additionalFields reach the inferred user.
  it('carries the username and the social profile', () => {
    expectTypeOf<AuthUser['username']>().toEqualTypeOf<string | null | undefined>();
    expectTypeOf<AuthUser['socialPlatform']>().toEqualTypeOf<string | null | undefined>();
    expectTypeOf<AuthUser['socialHandle']>().toEqualTypeOf<string | null | undefined>();
  });
});
