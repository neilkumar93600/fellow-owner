import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ensureDemoUsers } from '../../src/auth/demo.js';
import { buildContainer } from '../../src/container.js';
import { createApp } from '../../src/create-app.js';
import { cookieHeader } from '../helpers/auth.js';
import { createFactories } from '../helpers/factories.js';
import { closeDb, resetDatabase } from '../helpers/test-db.js';

const container = buildContainer();
const app = createApp(container);
const factories = createFactories(container);

// Same database, demo mode off: the 403 path.
const disabled = createApp(buildContainer({ env: { ...container.env, DEMO_ENABLED: false } }));

describe('POST /api/demo/session', () => {
  beforeAll(async () => {
    await resetDatabase();
    const demo = await ensureDemoUsers(container.auth, container.env);
    await factories.space({ owner: demo.creator, handle: 'mira', isDemo: true });
  });

  afterAll(async () => {
    await closeDb();
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
