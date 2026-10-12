import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { EnvError, loadEnv } from '../../src/config/env.js';
import {
  createFieldCipher,
  decodeFieldKey,
  fieldCipherFrom,
  isFieldEncryptionKey,
} from '../../src/lib/crypto.js';

const KEY = randomBytes(32).toString('base64');
const OTHER_KEY = randomBytes(32).toString('base64');
/** The instagram_connections_token_check pattern (db/schema/brands.ts). */
const DB_SHAPE = /^v[0-9]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

describe('field encryption (AES-256-GCM)', () => {
  const cipher = createFieldCipher(KEY);

  it('round-trips, with a fresh IV every time, in the shape the database accepts', () => {
    const token = 'IGQWRPa1ZA-long-lived-token-é✓';
    const a = cipher.encrypt(token);
    const b = cipher.encrypt(token);
    expect(a).not.toBe(b);
    expect(a).toMatch(DB_SHAPE);
    expect(a.startsWith('v1.')).toBe(true);
    expect(a).not.toContain('IGQ');
    expect(cipher.decrypt(a)).toBe(token);
    expect(cipher.decrypt(b)).toBe(token);
  });

  it('refuses tampered data, a cut tag, another key and other shapes', () => {
    const value = cipher.encrypt('secret-token');
    const [version, iv, tag, data] = value.split('.') as [string, string, string, string];
    const flipped = `${data.slice(0, -1)}${data.endsWith('A') ? 'B' : 'A'}`;
    expect(() => cipher.decrypt([version, iv, tag, flipped].join('.'))).toThrow();
    expect(() => cipher.decrypt([version, iv, tag.slice(0, 8), data].join('.'))).toThrow();
    expect(() => createFieldCipher(OTHER_KEY).decrypt(value)).toThrow();
    expect(() => cipher.decrypt('secret-token')).toThrow();
    expect(() => cipher.decrypt(`v2.${iv}.${tag}.${data}`)).toThrow();
    expect(() => cipher.encrypt('')).toThrow();
  });

  it('accepts only a 32-byte base64 key', () => {
    expect(isFieldEncryptionKey(KEY)).toBe(true);
    expect(isFieldEncryptionKey(KEY.replace(/=$/, ''))).toBe(true);
    expect(decodeFieldKey(randomBytes(32).toString('base64url'))?.length).toBe(32);
    expect(isFieldEncryptionKey(randomBytes(16).toString('base64'))).toBe(false);
    expect(isFieldEncryptionKey('not a key at all, just some words here!!')).toBe(false);
    expect(() => createFieldCipher('short')).toThrow(/32 bytes/);
    expect(fieldCipherFrom({ FIELD_ENCRYPTION_KEY: undefined })).toBeNull();
    expect(fieldCipherFrom({ FIELD_ENCRYPTION_KEY: KEY })?.decrypt(cipher.encrypt('x'))).toBe('x');
  });
});

describe('creator-suite env', () => {
  const production = {
    NODE_ENV: 'production',
    DATABASE_URL: 'postgres://u:p@db:5432/app',
    BETTER_AUTH_SECRET: 'x'.repeat(40),
    CRON_SECRET: 'cron',
    CLICK_SALT: 'salt',
    RESEND_API_KEY: 're_test',
    EMAIL_FROM: 'Fellow Owners <hi@example.com>',
    DEMO_ENABLED: 'false',
  };
  const meta = { META_APP_ID: '123', META_APP_SECRET: 'app-secret', META_VERIFY_TOKEN: 'verify' };

  it('keeps every feature off without its keys', () => {
    const env = loadEnv(production);
    expect(env.INSTAGRAM_ENABLED).toBe(false);
    expect(env.INBOUND_EMAIL_ENABLED).toBe(false);
    expect(env.TURNSTILE_ENABLED).toBe(false);
    expect(env.FIELD_ENCRYPTION_KEY).toBeUndefined();
  });

  it('needs FIELD_ENCRYPTION_KEY in production once Instagram is on', () => {
    expect(() => loadEnv({ ...production, ...meta })).toThrow(EnvError);
    const env = loadEnv({ ...production, ...meta, FIELD_ENCRYPTION_KEY: KEY });
    expect(env.INSTAGRAM_ENABLED).toBe(true);
    // Development runs Instagram without a key (the connect flow then refuses to store a token).
    expect(loadEnv({ NODE_ENV: 'development', ...meta }).INSTAGRAM_ENABLED).toBe(true);
  });

  it('refuses partial sets and malformed values', () => {
    expect(() => loadEnv({ ...production, META_APP_ID: '123' })).toThrow(EnvError);
    expect(() => loadEnv({ ...production, INBOUND_EMAIL_DOMAIN: 'in.example.com' })).toThrow(
      EnvError,
    );
    expect(() =>
      loadEnv({
        ...production,
        INBOUND_EMAIL_DOMAIN: 'not a domain',
        INBOUND_EMAIL_SECRET: 's'.repeat(40),
      }),
    ).toThrow(EnvError);
    expect(() => loadEnv({ ...production, FIELD_ENCRYPTION_KEY: 'too-short' })).toThrow(EnvError);
    const env = loadEnv({
      ...production,
      INBOUND_EMAIL_DOMAIN: 'In.Example.com',
      INBOUND_EMAIL_SECRET: 's'.repeat(40),
      TURNSTILE_SECRET_KEY: '0x4AAA',
    });
    expect(env.INBOUND_EMAIL_ENABLED).toBe(true);
    expect(env.INBOUND_EMAIL_DOMAIN).toBe('in.example.com');
    expect(env.TURNSTILE_ENABLED).toBe(true);
  });
});
