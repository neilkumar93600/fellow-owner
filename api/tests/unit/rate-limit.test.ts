import express, { type Express } from 'express';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { errorHandler } from '../../src/middlewares/error-handler.js';
import { createRateLimit } from '../../src/middlewares/rate-limit.js';

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
