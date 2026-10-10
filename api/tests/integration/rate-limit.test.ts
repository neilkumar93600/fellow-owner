import { PLATFORM_LOOKUP_LIMITS } from '@fellow-owners/shared';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { peekOtp } from '../../src/auth/email.js';
import { env } from '../../src/config/env.js';
import { buildContainer } from '../../src/container.js';
import { PLATFORM_LOOKUPS_PER_DAY } from '../../src/controllers/platform.controller.js';
import { createApp } from '../../src/create-app.js';
import { session } from '../../src/db/schema/auth.js';
import { withinCap } from '../../src/middlewares/rate-limit.js';
import { DEMO_SESSIONS_PER_HOUR } from '../../src/routes/demo.routes.js';
import { signInWithOtp, TEST_ORIGIN } from '../helpers/auth.js';
import { closeDb, db, resetDatabase } from '../helpers/test-db.js';

// X-Real-IP (set by Railway's edge in production) picks the counted IP: each test uses its own.
const container = buildContainer({ env: { ...env, APIFY_TOKEN: undefined, APIFY_ENABLED: false } });
const app = createApp(container);

beforeAll(async () => {
  await resetDatabase();
});
afterEach(() => {
  vi.useRealTimers();
});
afterAll(async () => {
  await container.background.whenIdle();
  await closeDb();
});

describe('public limiter', () => {
  it('the 121st public read in a minute from one IP gets 429 with headers', async () => {
    const ip = '203.0.113.1';
    for (let i = 0; i < 120; i += 1) {
      const res = await request(app).get('/api/spaces/nobody-here').set('X-Real-IP', ip);
      expect(res.status).toBe(404);
    }
    const res = await request(app).get('/api/spaces/nobody-here').set('X-Real-IP', ip).expect(429);
    expect(res.body.error.code).toBe('rate_limited');
    expect(res.headers['ratelimit-limit']).toBe('120');
    expect(res.headers['ratelimit-remaining']).toBe('0');
    expect(Number(res.headers['retry-after'])).toBeGreaterThan(0);
    // One bucket for every public read: showcase and short links count too.
    await request(app)
      .get('/api/spaces/nobody-here/showcase/thing')
      .set('X-Real-IP', ip)
      .expect(429);
    await request(app).get('/r/abc123').set('X-Real-IP', ip).expect(429);
    // Another IP is not affected.
    await request(app).get('/api/spaces/nobody-here').set('X-Real-IP', '203.0.113.2').expect(404);
  });

  it('handle checks: 30 per minute per IP', async () => {
    const ip = '203.0.113.3';
    for (let i = 0; i < 30; i += 1) {
      await request(app).get('/api/handle-available?h=freehandle').set('X-Real-IP', ip).expect(200);
    }
    const res = await request(app)
      .get('/api/handle-available?h=freehandle')
      .set('X-Real-IP', ip)
      .expect(429);
    expect(res.headers['ratelimit-limit']).toBe('30');
  });

  it('demo sessions: 10 per minute per IP', async () => {
    const ip = '203.0.113.4';
    for (let i = 0; i < 10; i += 1) {
      // An invalid body is still counted: the limiter runs first.
      await request(app).post('/api/demo/session').set('X-Real-IP', ip).send({}).expect(400);
    }
    await request(app).post('/api/demo/session').set('X-Real-IP', ip).send({}).expect(429);
  });

  it('the web server skips the limits with x-internal-key (INTERNAL_API_KEY); a wrong key does not', async () => {
    const key = 'k'.repeat(40);
    const saved = env.INTERNAL_API_KEY;
    // Limiters read the key when the routes are built.
    env.INTERNAL_API_KEY = key;
    let internalApp: ReturnType<typeof createApp>;
    try {
      internalApp = createApp(container);
    } finally {
      env.INTERNAL_API_KEY = saved;
    }
    const ip = '203.0.113.9';
    const read = () => request(internalApp).get('/api/spaces/nobody-here').set('X-Real-IP', ip);
    for (let i = 0; i < 120; i += 1) await read().expect(404);
    await read().set('x-internal-key', key).expect(404);
    await read().expect(429);
    await read().set('x-internal-key', 'w'.repeat(40)).expect(429);
    await read().set('x-internal-key', key).expect(404);
  });
});

describe('client IP (lib/client-ip.ts)', () => {
  const edgeKey = 'e'.repeat(40);
  const edgeApp = createApp(buildContainer({ env: { ...env, INTERNAL_API_KEY: edgeKey } }));
  const check = (headers: Record<string, string>) =>
    request(edgeApp).get('/api/handle-available?h=freehandle').set(headers).expect(200);

  it('a forged X-Forwarded-For without the edge key does not get a fresh bucket', async () => {
    const realIp = '203.0.113.60';
    const first = await check({ 'X-Real-IP': realIp, 'X-Forwarded-For': '6.6.6.1' });
    expect(first.headers['ratelimit-remaining']).toBe('29');
    const second = await check({ 'X-Real-IP': realIp, 'X-Forwarded-For': '6.6.6.2' });
    expect(second.headers['ratelimit-remaining']).toBe('28');
    // A wrong key is the same as none.
    const wrong = await check({
      'X-Real-IP': realIp,
      'X-Forwarded-For': '6.6.6.3',
      'x-edge-key': 'w'.repeat(40),
    });
    expect(wrong.headers['ratelimit-remaining']).toBe('27');
  });

  it('with the edge key the X-Forwarded-For client is counted, and the key skips no limit', async () => {
    const vercel = '76.76.21.9';
    const via = (client: string) => ({
      'X-Real-IP': vercel,
      'X-Forwarded-For': client,
      'x-edge-key': edgeKey,
    });
    expect((await check(via('203.0.113.61'))).headers['ratelimit-remaining']).toBe('29');
    expect((await check(via('203.0.113.62'))).headers['ratelimit-remaining']).toBe('29');
    expect((await check(via('203.0.113.61'))).headers['ratelimit-remaining']).toBe('28');
  });

  it('Better Auth records the same IP; a caller-sent x-fo-client-ip is replaced', async () => {
    const email = 'edge-ip@clientip.test';
    await request(edgeApp)
      .post('/api/auth/email-otp/send-verification-otp')
      .set('Origin', TEST_ORIGIN)
      .send({ email, type: 'sign-in' })
      .expect(200);
    const res = await request(edgeApp)
      .post('/api/auth/sign-in/email-otp')
      .set('Origin', TEST_ORIGIN)
      .set({
        'X-Real-IP': '76.76.21.9',
        'X-Forwarded-For': '203.0.113.63',
        'x-edge-key': edgeKey,
        'x-fo-client-ip': '6.6.6.6',
      })
      .send({ email, otp: peekOtp(email), name: 'Edge' })
      .expect(200);
    const [row] = await db
      .select({ ip: session.ipAddress })
      .from(session)
      .where(eq(session.userId, res.body.user.id));
    expect(row?.ip).toBe('203.0.113.63');
  });
});

describe('demo sessions: global hourly cap', () => {
  it(`after ${DEMO_SESSIONS_PER_HOUR} an hour in all, any IP gets 429`, async () => {
    for (let i = 0; i < DEMO_SESSIONS_PER_HOUR; i += 1) {
      await withinCap({
        name: 'demo-session-hour',
        key: 'all',
        windowSeconds: 3600,
        max: DEMO_SESSIONS_PER_HOUR,
        redis: null,
      });
    }
    await request(app)
      .post('/api/demo/session')
      .set('X-Real-IP', '203.0.113.70')
      .send({})
      .expect(429);
  });
});

describe('JSON body limits', () => {
  const body = (chars: number) => ({ avatarUrl: `data:image/png;base64,${'A'.repeat(chars)}` });

  it('settings and space creation accept up to 512kb (avatar data URLs)', async () => {
    // Under 512kb: parsed, then refused for the missing session (not 413).
    await request(app).put('/api/studio/settings').send(body(400_000)).expect(401);
    await request(app).post('/api/studio/space').send(body(400_000)).expect(401);
    await request(app).put('/api/studio/settings').send(body(600_000)).expect(413);
  });

  it('other routes keep 100kb', async () => {
    await request(app).put('/api/studio/communities/x').send(body(200_000)).expect(413);
  });
});

describe('platform lookups: daily caps', () => {
  it(`the ${PLATFORM_LOOKUPS_PER_DAY.user + 1}th lookup in a UTC day gets 429 daily_cap_reached`, async () => {
    const day = new Date();
    day.setUTCHours(24, 1, 0, 0); // just after the next UTC midnight, so the day window is fresh
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(day);
    const user = await signInWithOtp(app, 'daily@platform.test', 'Daily Creator');
    const lookup = () =>
      request(app)
        .post('/api/studio/platform-lookup')
        .set('Cookie', user.cookie)
        .send({ url: 'https://evil.com/x' });

    for (let i = 0; i < PLATFORM_LOOKUPS_PER_DAY.user; i += 1) {
      if (i > 0 && i % PLATFORM_LOOKUP_LIMITS.lookupsPerMinute === 0) {
        vi.setSystemTime(Date.now() + 61_000); // next minute window
      }
      await lookup().expect(200);
    }
    vi.setSystemTime(Date.now() + 61_000);
    const res = await lookup().expect(429);
    expect(res.body.error.code).toBe('daily_cap_reached');
  });
});
