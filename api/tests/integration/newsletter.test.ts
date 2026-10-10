import { sql } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { buildContainer } from '../../src/container.js';
import { createApp } from '../../src/create-app.js';
import { closeDb, db } from '../helpers/test-db.js';

async function rowsFor(email: string) {
  return db.execute(sql`select email, source from newsletter_subscribers where email = ${email}`);
}

describe('POST /api/newsletter', () => {
  beforeEach(async () => {
    await db.execute(sql`truncate table newsletter_subscribers`);
  });

  afterAll(async () => {
    await closeDb();
  });

  it('subscribes a new email, and answers the same for a repeat (one row, no enumeration)', async () => {
    const app = createApp(buildContainer());
    const first = await request(app)
      .post('/api/newsletter')
      .send({ email: '  Mira@Example.com ', source: 'footer' })
      .expect(200);
    expect(first.body).toEqual({ ok: true });

    const again = await request(app)
      .post('/api/newsletter')
      .send({ email: 'mira@example.com' })
      .expect(200);
    expect(again.body).toEqual(first.body);

    const rows = await rowsFor('mira@example.com');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ email: 'mira@example.com', source: 'footer' });
  });

  it('rejects a malformed email with 400 validation_error', async () => {
    const app = createApp(buildContainer());
    const res = await request(app)
      .post('/api/newsletter')
      .set('X-Real-IP', '203.0.113.51')
      .send({ email: 'not-an-email' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('validation_error');
    await request(app)
      .post('/api/newsletter')
      .set('X-Real-IP', '203.0.113.51')
      .send({})
      .expect(400);
    await request(app)
      .post('/api/newsletter')
      .set('X-Real-IP', '203.0.113.51')
      .send({ email: 'a@example.com', source: 'elsewhere' })
      .expect(400);
  });

  it('rate limits after 5 requests a minute from one IP', async () => {
    const app = createApp(buildContainer());
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post('/api/newsletter')
        .set('X-Real-IP', '203.0.113.52')
        .send({ email: `fan${i}@example.com` })
        .expect(200);
    }
    const res = await request(app)
      .post('/api/newsletter')
      .set('X-Real-IP', '203.0.113.52')
      .send({ email: 'fan6@example.com' });
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('rate_limited');
    expect(await rowsFor('fan6@example.com')).toHaveLength(0);
  });
});
