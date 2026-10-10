import { sql } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { env } from '../../src/config/env.js';
import { buildContainer } from '../../src/container.js';
import { createApp } from '../../src/create-app.js';
import type { MailMessage } from '../../src/lib/mailer.js';
import { closeDb, db } from '../helpers/test-db.js';

const sent: MailMessage[] = [];
const mailer = {
  async send(message: MailMessage) {
    sent.push(message);
  },
};
const app = createApp(
  buildContainer({ env: { ...env, ADMIN_EMAILS: ['boss@example.com'] }, mailer }),
);

const valid = {
  kind: 'contact',
  name: 'Mira',
  email: ' Mira@Example.com ',
  message: 'I cannot sign in to my space.',
};

async function rows() {
  return db.execute<{ email: string; kind: string }>(sql`select email, kind from support_requests`);
}

describe('POST /api/support/requests', () => {
  beforeEach(async () => {
    sent.length = 0;
    await db.execute(sql`delete from support_requests`);
  });

  afterAll(async () => {
    await closeDb();
  });

  it('stores the request, emails the admins and acknowledges the sender', async () => {
    const res = await request(app).post('/api/support/requests').send(valid).expect(202);
    expect(res.body).toEqual({ received: true });
    const stored = await rows();
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({ email: 'mira@example.com', kind: 'contact' });
    expect(sent.map((m) => m.to).sort()).toEqual(['boss@example.com', 'mira@example.com']);
  });

  it('silently drops a filled honeypot (same 202, nothing stored or sent)', async () => {
    const res = await request(app)
      .post('/api/support/requests')
      .send({ ...valid, website: 'http://spam.example' })
      .expect(202);
    expect(res.body).toEqual({ received: true });
    expect(await rows()).toHaveLength(0);
    expect(sent).toHaveLength(0);
  });

  it('rejects a malformed request with 400', async () => {
    await request(app)
      .post('/api/support/requests')
      .send({ ...valid, message: 'short' })
      .expect(400);
  });

  // Last on purpose: the limiter window is shared by every request above (same IP).
  it('allows 5 an hour per IP, then 429', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) {
      const res = await request(app).post('/api/support/requests').send(valid);
      statuses.push(res.status);
    }
    expect(statuses[0]).toBe(202);
    expect(statuses).toContain(429);
  });
});
