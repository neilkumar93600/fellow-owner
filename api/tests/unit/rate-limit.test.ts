import express, { type Express } from 'express';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { errorHandler } from '../../src/middlewares/error-handler.js';
import { createRateLimit, withinCap } from '../../src/middlewares/rate-limit.js';

function appWith(max: number, windowSeconds = 60): Express {
  const app = express();
  app.get(
    '/',
    createRateLimit({
      name: `test-${Math.random()}`,
      windowSeconds,
      max,
      key: (req) => req.get('x-client') ?? 'anon',
      redis: null,
    }),
    (_req, res) => {
      res.json({ ok: true });
    },
  );
  app.use(errorHandler());
  return app;
}

describe('createRateLimit (memory store)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('lets max calls through, then answers 429 rate_limited with headers', async () => {
    const app = appWith(2);
    const first = await request(app).get('/').set('x-client', 'a').expect(200);
    expect(first.headers['ratelimit-limit']).toBe('2');
    expect(first.headers['ratelimit-remaining']).toBe('1');
    await request(app).get('/').set('x-client', 'a').expect(200);
    const third = await request(app).get('/').set('x-client', 'a').expect(429);
    expect(third.body.error.code).toBe('rate_limited');
    expect(third.headers['ratelimit-remaining']).toBe('0');
    expect(Number(third.headers['retry-after'])).toBeGreaterThan(0);
  });

  it('counts each key separately', async () => {
    const app = appWith(1);
    await request(app).get('/').set('x-client', 'a').expect(200);
    await request(app).get('/').set('x-client', 'b').expect(200);
    await request(app).get('/').set('x-client', 'a').expect(429);
  });

  it('starts a fresh window after windowSeconds', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-10T12:00:00Z'));
    const app = appWith(1, 60);
    await request(app).get('/').set('x-client', 'a').expect(200);
    await request(app).get('/').set('x-client', 'a').expect(429);
    vi.setSystemTime(new Date('2026-10-10T12:01:01Z'));
    await request(app).get('/').set('x-client', 'a').expect(200);
  });
});

describe('withinCap (memory store)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows max hits per key in a window that starts at the first hit', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-10T23:59:00Z'));
    const cap = (key: string) =>
      withinCap({ name: 'unit-cap', key, windowSeconds: 86_400, max: 1, redis: null });
    expect(await cap('a@example.com')).toBe(true);
    expect(await cap('b@example.com')).toBe(true);
    // Past UTC midnight but inside 24 h of the first hit: still capped.
    vi.setSystemTime(new Date('2026-10-11T00:01:00Z'));
    expect(await cap('a@example.com')).toBe(false);
    vi.setSystemTime(new Date('2026-10-11T23:59:01Z'));
    expect(await cap('a@example.com')).toBe(true);
  });
});
