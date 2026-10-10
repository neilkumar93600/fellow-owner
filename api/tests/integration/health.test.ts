import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { buildContainer } from '../../src/container.js';
import { createApp } from '../../src/create-app.js';
import { closeDb } from '../helpers/test-db.js';

describe('platform', () => {
  const app = createApp(buildContainer());

  afterAll(async () => {
    await closeDb();
  });

  it('GET /api/health reports the database', async () => {
    const res = await request(app).get('/api/health').expect(200);
    expect(res.body).toEqual({ ok: true, db: 'up', version: expect.any(String) });
    expect(res.headers['x-request-id']).toEqual(expect.any(String));
    expect(res.headers['cache-control']).toBe('no-store');
  });

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
