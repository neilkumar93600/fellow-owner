import { sql } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { env } from '../../src/config/env.js';
import { buildContainer } from '../../src/container.js';
import { createApp } from '../../src/create-app.js';
import type { MailMessage } from '../../src/lib/mailer.js';
import { SUPPORT_ACK, SUPPORT_EMAIL_CAPS } from '../../src/services/support.service.js';
import { signInWithOtp } from '../helpers/auth.js';
import { closeDb, db } from '../helpers/test-db.js';

const sent: MailMessage[] = [];
const mailer = {
  async send(message: MailMessage) {
    sent.push(message);
  },
};
const container = buildContainer({ env: { ...env, ADMIN_EMAILS: ['boss@example.com'] }, mailer });
const app = createApp(container);

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

  it('acknowledges with fixed text that never repeats the name or message', async () => {
    await request(app)
      .post('/api/support/requests')
      .set('X-Real-IP', '198.51.100.10')
      .send({
        ...valid,
        email: 'fixed@example.com',
        name: 'Win a prize',
        message: 'Click http://evil.example now',
      })
      .expect(202);
    const ack = sent.find((m) => m.to === 'fixed@example.com');
    expect(ack).toMatchObject(SUPPORT_ACK);
    expect(ack?.text).not.toContain('evil.example');
    expect(ack?.text).not.toContain('Win a prize');
  });

  it('acknowledges one address once per 24 h, whatever the IP; requests are still stored', async () => {
    for (const ip of ['198.51.100.11', '198.51.100.12', '198.51.100.13']) {
      await request(app)
        .post('/api/support/requests')
        .set('X-Real-IP', ip)
        .send({ ...valid, email: 'once@example.com' })
        .expect(202);
    }
    expect(sent.filter((m) => m.to === 'once@example.com')).toHaveLength(1);
    expect(sent.filter((m) => m.to === 'boss@example.com')).toHaveLength(3);
    expect(await rows()).toHaveLength(3);
  });

  it(`sends at most ${SUPPORT_EMAIL_CAPS.ackPerDay} acknowledgements a day in all`, async () => {
    for (let i = 0; i < SUPPORT_EMAIL_CAPS.ackPerDay + 5; i++) {
      await container.services.support.submit(
        { kind: 'contact', email: `bulk${i}@example.com`, message: 'Hello there, a question.' },
        null,
      );
    }
    const acks = sent.filter((m) => m.to.startsWith('bulk'));
    // Earlier tests in this file already used a few of the day's acknowledgements.
    expect(acks.length).toBeLessThan(SUPPORT_EMAIL_CAPS.ackPerDay);
    expect(acks.length).toBeGreaterThan(SUPPORT_EMAIL_CAPS.ackPerDay - 10);
    expect(await rows()).toHaveLength(SUPPORT_EMAIL_CAPS.ackPerDay + 5);
  });

  it('records the signed-in sender as user_id', async () => {
    const user = await signInWithOtp(app, 'support-user@example.com', 'Support User');
    await request(app)
      .post('/api/support/requests')
      .set('Cookie', user.cookie)
      .set('X-Real-IP', '198.51.100.14')
      .send({ ...valid, kind: 'privacy_export', email: user.email })
      .expect(202);
    const stored = await db.execute<{ user_id: string | null }>(
      sql`select user_id from support_requests`,
    );
    expect(stored[0]?.user_id).toBe(user.userId);
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
