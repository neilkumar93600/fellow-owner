import express from 'express';
import { createClient } from 'redis';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createSendThrottle } from '../../src/auth/email.js';
import { logger } from '../../src/lib/logger.js';
import { errorHandler } from '../../src/middlewares/error-handler.js';
import { createRateLimit, withinCap } from '../../src/middlewares/rate-limit.js';

// The Redis branches of createRateLimit, withinCap and createSendThrottle, against a real Redis.
// Runs only when TEST_REDIS_URL is set (CI provides a redis:7 service); locally:
// docker run -d --rm --name fo-redis-test -p 6380:6379 redis:7-alpine
// TEST_REDIS_URL=redis://localhost:6380 pnpm exec vitest run --project integration tests/integration/redis-limits.test.ts
const redisUrl = process.env.TEST_REDIS_URL;

describe.skipIf(!redisUrl)('limits on Redis', () => {
  const redis = createClient({ url: redisUrl });
  // A throwaway namespace per run, so reruns and other tests never share counters.
  const run = `t${Date.now()}${Math.floor(Math.random() * 1e6)}`;

  beforeAll(async () => {
    await redis.connect();
  });
  afterAll(() => {
    redis.destroy();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const appWith = (name: string, max: number, windowSeconds: number, client = redis) => {
    const app = express();
    app.get(
      '/',
      createRateLimit({
        name,
        windowSeconds,
        max,
        key: (req) => req.get('x-client') ?? 'anon',
        redis: client,
        internalKey: null,
      }),
      (_req, res) => {
        res.json({ ok: true });
      },
    );
    app.use(errorHandler());
    return app;
  };

  describe('createRateLimit', () => {
    it('counts in Redis, refuses the max+1th call, and the counter key expires', async () => {
      const name = `${run}-rl`;
      const app = appWith(name, 2, 60);
      const first = await request(app).get('/').set('x-client', 'a').expect(200);
      expect(first.headers['ratelimit-remaining']).toBe('1');
      await request(app).get('/').set('x-client', 'a').expect(200);
      const third = await request(app).get('/').set('x-client', 'a').expect(429);
      expect(third.body.error.code).toBe('rate_limited');
      expect(Number(third.headers['retry-after'])).toBeGreaterThan(0);
      // Another key has its own count.
      await request(app).get('/').set('x-client', 'b').expect(200);

      const keys = await redis.keys(`rl:${name}:a:*`);
      expect(keys).toHaveLength(1);
      expect(await redis.get(keys[0] as string)).toBe('3');
      const ttl = await redis.pTTL(keys[0] as string);
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(61_000);
    });

    it('starts a fresh window when the window rolls over', async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2026-10-10T12:00:00Z'));
      const app = appWith(`${run}-roll`, 1, 60);
      await request(app).get('/').set('x-client', 'a').expect(200);
      await request(app).get('/').set('x-client', 'a').expect(429);
      vi.setSystemTime(new Date('2026-10-10T12:01:01Z'));
      await request(app).get('/').set('x-client', 'a').expect(200);
    });

    it('falls back to the in-process count when Redis is unreachable, without throwing', async () => {
      const offline = createClient({
        url: 'redis://127.0.0.1:1',
        commandOptions: { timeout: 200 },
      });
      offline.on('error', () => {});
      const app = appWith(`${run}-down`, 1, 60, offline);
      await request(app).get('/').set('x-client', 'a').expect(200);
      await request(app).get('/').set('x-client', 'a').expect(429);
      offline.destroy();
    });
  });

  describe('withinCap', () => {
    const cap = (name: string, key: string, max: number, windowSeconds = 60) =>
      withinCap({ name, key, windowSeconds, max, redis });

    it('allows max hits, then refuses; the key always carries an expiry', async () => {
      const name = `${run}-cap`;
      expect(await cap(name, 'a@example.com', 2, 120)).toBe(true);
      const ttlAfterFirst = await redis.pTTL(`cap:${name}:a@example.com`);
      expect(ttlAfterFirst).toBeGreaterThan(0);
      expect(ttlAfterFirst).toBeLessThanOrEqual(120_000);
      expect(await cap(name, 'a@example.com', 2, 120)).toBe(true);
      expect(await cap(name, 'a@example.com', 2, 120)).toBe(false);
      expect(await cap(name, 'a@example.com', 2, 120)).toBe(false);
      expect(await cap(name, 'b@example.com', 2, 120)).toBe(true);
      // The window starts at the first hit: later hits never extend it, never drop it.
      const ttl = await redis.pTTL(`cap:${name}:a@example.com`);
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(ttlAfterFirst);
    });

    it('lets the key go once its window has passed', async () => {
      const name = `${run}-cap-expiry`;
      expect(await cap(name, 'x', 1, 1)).toBe(true);
      expect(await cap(name, 'x', 1, 1)).toBe(false);
      await vi.waitUntil(async () => (await redis.exists(`cap:${name}:x`)) === 0, {
        timeout: 3_000,
        interval: 100,
      });
      expect(await cap(name, 'x', 1, 1)).toBe(true);
    });

    it('counts in memory when Redis is unreachable, without throwing', async () => {
      const offline = createClient({
        url: 'redis://127.0.0.1:1',
        commandOptions: { timeout: 200 },
      });
      offline.on('error', () => {});
      const options = { name: `${run}-cap-down`, key: 'k', windowSeconds: 60, max: 1 };
      expect(await withinCap({ ...options, redis: offline })).toBe(true);
      expect(await withinCap({ ...options, redis: offline })).toBe(false);
      offline.destroy();
    });
  });

  describe('createSendThrottle', () => {
    it('one code per address per minute, 5 per window, and both keys expire', async () => {
      const address = `${run}@example.com`;
      const throttle = createSendThrottle(redis, logger);
      expect(await throttle.allow(address.toUpperCase())).toBe(true);
      // Inside the 60 s gap: dropped.
      expect(await throttle.allow(address)).toBe(false);
      const gapTtl = await redis.pTTL(`otp-gap:${address}`);
      expect(gapTtl).toBeGreaterThan(0);
      expect(gapTtl).toBeLessThanOrEqual(60_000);
      const [windowKey] = await redis.keys(`otp-window:${address}:*`);
      expect(windowKey).toBeDefined();
      const windowTtl = await redis.pTTL(windowKey as string);
      expect(windowTtl).toBeGreaterThan(0);
      expect(windowTtl).toBeLessThanOrEqual(15 * 60 * 1000 + 1000);

      // Lift the gap between sends to reach the per-window cap of 5.
      for (let sent = 2; sent <= 5; sent += 1) {
        await redis.del(`otp-gap:${address}`);
        expect(await throttle.allow(address)).toBe(true);
      }
      await redis.del(`otp-gap:${address}`);
      expect(await throttle.allow(address)).toBe(false);
    });

    it('falls back to memory when Redis is unreachable, without throwing', async () => {
      const offline = createClient({
        url: 'redis://127.0.0.1:1',
        commandOptions: { timeout: 200 },
      });
      offline.on('error', () => {});
      const throttle = createSendThrottle(offline, logger);
      expect(await throttle.allow('down@example.com')).toBe(true);
      expect(await throttle.allow('down@example.com')).toBe(false);
      offline.destroy();
    });
  });
});
