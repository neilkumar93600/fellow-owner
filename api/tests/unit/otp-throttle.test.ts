import { describe, expect, it } from 'vitest';
import { createSendThrottle } from '../../src/auth/email.js';
import { logger } from '../../src/lib/logger.js';
import type { Redis } from '../../src/lib/redis.js';

/** Just the commands the throttle uses (expiry is recorded, not enforced). */
function fakeRedis() {
  const values = new Map<string, number>();
  const expiries = new Map<string, number>();
  const client = {
    isOpen: true,
    async set(
      key: string,
      value: string,
      options: { condition: 'NX'; expiration: { value: number } },
    ) {
      if (options.condition === 'NX' && values.has(key)) return null;
      values.set(key, Number(value));
      expiries.set(key, options.expiration.value);
      return 'OK';
    },
    async incr(key: string) {
      const next = (values.get(key) ?? 0) + 1;
      values.set(key, next);
      return next;
    },
    async expire(key: string, seconds: number) {
      expiries.set(key, seconds);
      return 1;
    },
  };
  return { redis: client as unknown as Redis, values, expiries };
}

describe('createSendThrottle (memory store)', () => {
  it('allows one code per address per 60 s and 5 per 15 minutes', async () => {
    let now = Date.parse('2026-10-10T08:00:00Z');
    const throttle = createSendThrottle(null, logger, () => now);

    expect(await throttle.allow('Priya@Example.com')).toBe(true);
    // Same address (any case), inside the minute: dropped. Another address is not affected.
    expect(await throttle.allow('priya@example.com')).toBe(false);
    expect(await throttle.allow('raj@example.com')).toBe(true);

    for (let sent = 1; sent < 5; sent += 1) {
      now += 61_000;
      expect(await throttle.allow('priya@example.com')).toBe(true);
    }
    now += 61_000;
    expect(await throttle.allow('priya@example.com')).toBe(false);

    // The next 15-minute window starts a new count: no day-long lockout.
    now = Date.parse('2026-10-10T08:15:00Z');
    expect(await throttle.allow('priya@example.com')).toBe(true);
  });
});

describe('createSendThrottle (redis store)', () => {
  it('SET NX EX for the 60 s gap, INCR + EXPIRE per 15-minute window, 5 per window', async () => {
    const now = Date.parse('2026-10-10T08:00:00Z');
    const { redis, values, expiries } = fakeRedis();
    const throttle = createSendThrottle(redis, logger, () => now);
    const window = Math.floor(now / (15 * 60 * 1000));

    expect(await throttle.allow('Priya@Example.com')).toBe(true);
    expect(expiries.get('otp-gap:priya@example.com')).toBe(60);
    expect(values.get(`otp-window:priya@example.com:${window}`)).toBe(1);
    expect(expiries.get(`otp-window:priya@example.com:${window}`)).toBe(15 * 60 + 1);
    // The gap key is still there: dropped.
    expect(await throttle.allow('priya@example.com')).toBe(false);

    // Gap expired four more times: allowed up to 5 in the window, then refused.
    for (let sent = 1; sent < 5; sent += 1) {
      values.delete('otp-gap:priya@example.com');
      expect(await throttle.allow('priya@example.com')).toBe(true);
    }
    values.delete('otp-gap:priya@example.com');
    expect(await throttle.allow('priya@example.com')).toBe(false);
  });

  it('counts in memory when redis fails', async () => {
    const broken = {
      isOpen: true,
      set: async () => {
        throw new Error('down');
      },
    } as unknown as Redis;
    const throttle = createSendThrottle(broken, logger, () => Date.parse('2026-10-10T08:00:00Z'));
    expect(await throttle.allow('priya@example.com')).toBe(true);
    expect(await throttle.allow('priya@example.com')).toBe(false);
  });
});
