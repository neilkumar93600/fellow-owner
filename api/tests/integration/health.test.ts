import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { buildContainer } from '../../src/container.js';
import { createApp } from '../../src/create-app.js';
import type { Db } from '../../src/db/client.js';
import { closeDb } from '../helpers/test-db.js';

describe('platform', () => {
  const container = buildContainer();
  const app = createApp(container);
  /** Same app, with a database client whose queries fail or never answer. */
  const withDb = (execute: () => Promise<unknown>) =>
    createApp({ ...container, db: { execute } as unknown as Db });

  afterAll(async () => {
    await closeDb();
  });

  it('GET /api/health reports the database and the AI mode', async () => {
    const res = await request(app).get('/api/health').expect(200);
    expect(res.body).toEqual({ status: 'ok', db: 'ok', ai: 'fake', version: expect.any(String) });
    expect(res.headers['x-request-id']).toEqual(expect.any(String));
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('GET /api/health is 503 when the database fails', async () => {
    const res = await request(withDb(() => Promise.reject(new Error('down'))))
      .get('/api/health')
      .expect(503);
    expect(res.body).toEqual({
      status: 'error',
      db: 'down',
      ai: 'fake',
      version: expect.any(String),
    });
  });

  it('GET /api/health is 503 when the database takes over 2 s', async () => {
    const started = Date.now();
    await request(withDb(() => new Promise(() => {})))
      .get('/api/health')
      .expect(503);
    expect(Date.now() - started).toBeLessThan(4000);
  }, 6000);

  it('echoes a well-formed incoming request id', async () => {
    const res = await request(app).get('/api/health').set('x-request-id', 'trace-1234abcd');
    expect(res.headers['x-request-id']).toBe('trace-1234abcd');
  });

  it('answers unknown routes with the error shape', async () => {
    const res = await request(app).get('/api/does-not-exist').expect(404);
    expect(res.body).toEqual({ error: { code: 'not_found', message: expect.any(String) } });
  });

  it('rejects malformed JSON with 400 bad_request', async () => {
    const res = await request(app)
      .post('/api/health')
      .set('content-type', 'application/json')
      .send('{"broken"')
      .expect(400);
    expect(res.body.error.code).toBe('bad_request');
  });

  it('guards cron routes with the cron secret', async () => {
    await request(app).post('/api/cron/purge').expect(401);
  });
});
