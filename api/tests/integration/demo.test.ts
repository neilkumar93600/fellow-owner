import {
  DAILY_CAPS,
  DEMO_AI_DAILY_TOKEN_BUDGET,
  DEMO_CAP_SCALE,
  LIMITS,
} from '@fellow-owners/shared';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { ensureDemoUsers } from '../../src/auth/demo.js';
import { buildContainer } from '../../src/container.js';
import { createApp } from '../../src/create-app.js';
import { withinCap } from '../../src/middlewares/rate-limit.js';
import {
  DEMO_SESSIONS_PER_HOUR,
  DEMO_SESSIONS_PER_IP_PER_HOUR,
  DEMO_SESSIONS_PER_MINUTE,
} from '../../src/routes/demo.routes.js';
import { cookieHeader } from '../helpers/auth.js';
import { createFactories } from '../helpers/factories.js';
import { closeDb, resetDatabase } from '../helpers/test-db.js';

const container = buildContainer();
const app = createApp(container);
const factories = createFactories(container);

// Same database, demo mode off: the 403 path.
const disabled = createApp(buildContainer({ env: { ...container.env, DEMO_ENABLED: false } }));

afterAll(async () => {
  await closeDb();
});

describe('POST /api/demo/session', () => {
  let demoSpaceId: string;
  beforeAll(async () => {
    await resetDatabase();
    const demo = await ensureDemoUsers(container.auth, container.env);
    demoSpaceId = (await factories.space({ owner: demo.creator, handle: 'mira', isDemo: true }))
      .space.id;
  });

  it('gives the demo space DEMO_AI_DAILY_TOKEN_BUDGET and real spaces their own budget', async () => {
    const demo = await container.repos.aiRuns.budgetState(demoSpaceId);
    expect(demo).toMatchObject({ budget: DEMO_AI_DAILY_TOKEN_BUDGET, isDemo: true });
    const real = await factories.space({ handle: 'realbudget' });
    const own = await container.repos.aiRuns.budgetState(real.space.id);
    expect(own).toMatchObject({ budget: LIMITS.ai.defaultDailyTokenBudget, isDemo: false });
    expect(await container.repos.aiRuns.isDemoSpace(demoSpaceId)).toBe(true);
    expect(await container.repos.aiRuns.isDemoSpace(real.space.id)).toBe(false);
  });

  it('signs in the demo creator and sends them to Today', async () => {
    const res = await request(app).post('/api/demo/session').send({ as: 'creator' }).expect(200);

    expect(res.body).toEqual({ as: 'creator', redirectTo: '/dashboard' });
    expect(res.headers['cache-control']).toBe('private, no-store');

    // The cookie it set is a working session.
    const session = await container.auth.api.getSession({
      headers: new Headers({ cookie: cookieHeader(res.headers['set-cookie']) }),
    });
    expect(session?.user.email).toBe(container.env.DEMO_CREATOR_EMAIL);
  });

  it('signs in the demo fan and sends them to the demo bio page', async () => {
    const res = await request(app).post('/api/demo/session').send({ as: 'fan' }).expect(200);

    expect(res.body).toEqual({ as: 'fan', redirectTo: '/mira' });
    const session = await container.auth.api.getSession({
      headers: new Headers({ cookie: cookieHeader(res.headers['set-cookie']) }),
    });
    expect(session?.user.email).toBe(container.env.DEMO_FAN_EMAIL);
  });

  it('rejects an unknown role with validation_error', async () => {
    const res = await request(app).post('/api/demo/session').send({ as: 'admin' }).expect(400);
    expect(res.body.error.code).toBe('validation_error');
  });

  // CTO finding 3: the demo creator's profile is the public /mira page.
  it('keeps the demo profile read-only but lets studio-only settings save', async () => {
    const signIn = await request(app).post('/api/demo/session').send({ as: 'creator' }).expect(200);
    const cookie = cookieHeader(signIn.headers['set-cookie']);
    const put = (body: object) =>
      request(app).put('/api/studio/settings').set('Cookie', cookie).send(body);

    const profile = await put({ profile: { displayName: 'Defaced', bio: 'hi', platforms: [] } });
    expect(profile.status).toBe(403);
    expect(profile.body.error.message).toBe('The demo profile is read-only.');

    const taste = await put({ tasteProfile: { promote: ['anything'], never: [], voice: [] } });
    expect(taste.status).toBe(403);
    expect(taste.body.error.message).toBe('The demo profile is read-only.');

    // Mixed with an allowed field, the whole write is refused.
    await put({ showReadReceipts: false, profile: { displayName: 'X', platforms: [] } }).expect(
      403,
    );

    const receipts = await put({ showReadReceipts: false }).expect(200);
    expect(receipts.body.showReadReceipts).toBe(false);
    const space = await request(app).get('/api/studio/space').set('Cookie', cookie).expect(200);
    expect(space.body.displayName).not.toBe('Defaced');
  });

  // CTO finding 1: every judge is the same demo fan, so the demo space gets DEMO_CAP_SCALE x pitches.
  it('lets the shared demo fan pitch past the real-space cap', async () => {
    const signIn = await request(app).post('/api/demo/session').send({ as: 'fan' }).expect(200);
    const cookie = cookieHeader(signIn.headers['set-cookie']);
    const body = {
      type: 'collab',
      subject: 'Partnership on a travel series',
      body: 'We would love to partner with you on a budget travel series for fans next month.',
      links: [],
    };
    for (let i = 0; i <= DAILY_CAPS.pitches; i += 1) {
      await request(app)
        .post('/api/spaces/mira/pitches')
        .set('Cookie', cookie)
        .send(body)
        .expect(201);
    }
    const me = await request(app).get('/api/spaces/mira/me').set('Cookie', cookie).expect(200);
    expect(me.body.caps.pitchesLeftToday).toBe(
      DAILY_CAPS.pitches * DEMO_CAP_SCALE - DAILY_CAPS.pitches - 1,
    );
  });

  it('answers 403 demo_disabled when DEMO_ENABLED=false', async () => {
    const res = await request(disabled)
      .post('/api/demo/session')
      .send({ as: 'creator' })
      .expect(403);
    expect(res.body.error.code).toBe('demo_disabled');
  });
});

// Limiter windows run on Date.now(); only Date is faked, so Postgres and supertest timers still run.
describe('POST /api/demo/session limits', () => {
  const start = (iso: string) => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(iso));
  };
  const nextMinute = () => vi.setSystemTime(new Date(Date.now() + 61_000));
  const post = (ip: string, body: object) =>
    request(app).post('/api/demo/session').set('X-Real-IP', ip).send(body);

  afterEach(() => {
    vi.useRealTimers();
  });

  it('sizes the per-IP limits for a room of judges on one network', () => {
    expect(DEMO_SESSIONS_PER_MINUTE).toBe(30);
    expect(DEMO_SESSIONS_PER_IP_PER_HOUR).toBe(150);
  });

  it('lets 25 visitors behind one IP sign in within a minute', async () => {
    start('2031-01-01T00:00:00Z');
    for (let i = 0; i < 25; i += 1) {
      await post('203.0.113.90', { as: i % 2 ? 'fan' : 'creator' }).expect(200);
    }
  });

  it('answers a 429 with Retry-After once one IP passes the minute limit', async () => {
    start('2031-02-01T00:00:00Z');
    const ip = '203.0.113.91';
    for (let i = 0; i < DEMO_SESSIONS_PER_MINUTE; i += 1) {
      await post(ip, { as: 'admin' }).expect(400);
    }
    const res = await post(ip, { as: 'creator' }).expect(429);
    expect(res.body.error.code).toBe('rate_limited');
    const retryAfter = Number(res.headers['retry-after']);
    expect(retryAfter).toBeGreaterThan(0);
    expect(retryAfter).toBeLessThanOrEqual(60);
  });

  it(`limits one IP to ${DEMO_SESSIONS_PER_IP_PER_HOUR} an hour across minute windows`, async () => {
    start('2031-03-01T00:00:00Z');
    const ip = '203.0.113.70';
    let sent = 0;
    while (sent < DEMO_SESSIONS_PER_IP_PER_HOUR) {
      for (
        let i = 0;
        i < DEMO_SESSIONS_PER_MINUTE && sent < DEMO_SESSIONS_PER_IP_PER_HOUR;
        i += 1
      ) {
        await post(ip, { as: 'admin' }).expect(400);
        sent += 1;
      }
      nextMinute();
    }
    const res = await post(ip, { as: 'admin' }).expect(429);
    expect(res.body.error.code).toBe('rate_limited');
    // Another IP is unaffected.
    await post('203.0.113.71', { as: 'admin' }).expect(400);
  });

  it('does not count malformed bodies against the hourly cap for everyone', async () => {
    start('2031-04-01T00:00:00Z');
    for (let i = 0; i < DEMO_SESSIONS_PER_HOUR - 1; i += 1) {
      await withinCap({
        name: 'demo-session-hour',
        key: 'all',
        windowSeconds: 3600,
        max: DEMO_SESSIONS_PER_HOUR,
        redis: null,
      });
    }
    await post('203.0.113.80', { as: 'admin' }).expect(400);
    // The last slot is still free for a real visitor.
    await post('203.0.113.81', { as: 'creator' }).expect(200);
    await post('203.0.113.82', { as: 'creator' }).expect(429);
  });
});
