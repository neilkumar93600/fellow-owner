import { createClient } from 'redis';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { redisRateLimitStorage } from '../../src/auth/index.js';
import { logger } from '../../src/lib/logger.js';
import { createMemoryPubSub, createRedisPubSub } from '../../src/lib/pubsub.js';

describe('createMemoryPubSub', () => {
  it('fans each event out to every listener until it unsubscribes', async () => {
    const pubsub = createMemoryPubSub();
    const a = vi.fn();
    const b = vi.fn();
    const stopA = pubsub.subscribe(a);
    pubsub.subscribe(b);

    await pubsub.publish({ userId: 'u1', spaceId: 's1' });
    stopA();
    await pubsub.publish({ userId: 'u2', spaceId: null });

    expect(pubsub.ready).toBe(true);
    expect(a.mock.calls).toEqual([[{ userId: 'u1', spaceId: 's1' }]]);
    expect(b.mock.calls).toEqual([
      [{ userId: 'u1', spaceId: 's1' }],
      [{ userId: 'u2', spaceId: null }],
    ]);
  });
});

// Against a real Redis only when TEST_REDIS_URL is set, e.g. a throwaway container:
// docker run -d --name fo-redis-test -p 6380:6379 redis:7-alpine
// TEST_REDIS_URL=redis://localhost:6380 pnpm exec vitest run --project unit tests/unit/pubsub.test.ts
const redisUrl = process.env.TEST_REDIS_URL;

describe.skipIf(!redisUrl)('Redis', () => {
  const redis = createClient({ url: redisUrl });
  const subscriber = createClient({ url: redisUrl, socket: { family: 0 } });
  beforeAll(() => redis.connect());
  afterAll(() => {
    redis.destroy();
    subscriber.destroy();
  });

  it('rate limit: allows `max` per window, then refuses until the key expires', async () => {
    const storage = redisRateLimitStorage(redis, logger);
    const key = `test-${Date.now()}|/sign-in/email`;
    const rule = { window: 2, max: 3 };
    const results = [];
    for (let i = 0; i < 4; i += 1) results.push(await storage.consume(key, rule));

    expect(results.map((r) => r.allowed)).toEqual([true, true, true, false]);
    expect(results[3]?.retryAfter).toBeGreaterThanOrEqual(1);
    expect(results[3]?.retryAfter).toBeLessThanOrEqual(2);
    const ttl = await redis.pTTL(`rate-limit:${key}`);
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(2000);
  });

  it('rate limit: fails open while Redis is unreachable', async () => {
    const offline = createClient({
      url: 'redis://127.0.0.1:1',
      commandOptions: { timeout: 200 },
    });
    offline.on('error', () => {});
    const storage = redisRateLimitStorage(offline, logger);
    expect(await storage.consume('k', { window: 10, max: 1 })).toEqual({
      allowed: true,
      retryAfter: null,
    });
    offline.destroy();
  });

  it('pub/sub: one subscription delivers to the local listeners', async () => {
    const pubsub = createRedisPubSub(redis, subscriber, logger);
    const seen = new Promise((resolve) => pubsub.subscribe(resolve));
    await vi.waitUntil(async () => (await redis.pubSubNumSub('notifications')).notifications === 1);
    await pubsub.publish({ userId: 'u1', spaceId: null });
    expect(await seen).toEqual({ userId: 'u1', spaceId: null });
  });
});
