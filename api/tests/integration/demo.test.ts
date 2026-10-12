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
  beforeAll(async () => {
    await resetDatabase();
    const demo = await ensureDemoUsers(container.auth, container.env);
    await factories.space({ owner: demo.creator, handle: 'mira', isDemo: true });
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
