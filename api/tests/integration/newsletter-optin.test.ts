import { sql } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { env } from '../../src/config/env.js';
import { buildContainer } from '../../src/container.js';
import { createApp } from '../../src/create-app.js';
import type { MailMessage } from '../../src/lib/mailer.js';
import { signToken } from '../../src/lib/signed-token.js';
import { closeDb, db } from '../helpers/test-db.js';

const sent: MailMessage[] = [];
const mailer = {
  async send(message: MailMessage) {
    sent.push(message);
  },
};

async function row(email: string) {
  const [found] = await db.execute<{ confirmed_at: Date | null; unsubscribed_at: Date | null }>(
    sql`select confirmed_at, unsubscribed_at from newsletter_subscribers where email = ${email}`,
  );
  return found;
}

const secret = env.BETTER_AUTH_SECRET;

describe('newsletter double opt-in', () => {
  beforeEach(async () => {
    sent.length = 0;
    await db.execute(sql`delete from newsletter_subscribers`);
  });

  afterAll(async () => {
    await closeDb();
  });

  it('sends a confirm email, confirms from its link and redirects', async () => {
    const app = createApp(buildContainer({ mailer }));
    await request(app).post('/api/newsletter').send({ email: 'Mira@Example.com' }).expect(200);
    expect(sent).toHaveLength(1);
    expect(sent[0]?.to).toBe('mira@example.com');
    const link = sent[0]?.text.match(/https?:\/\/\S+\/api\/newsletter\/confirm\?token=\S+/)?.[0];
    expect(link).toBeTruthy();
    expect((await row('mira@example.com'))?.confirmed_at).toBeNull();

    const url = new URL(link ?? '');
    const res = await request(app)
      .get(url.pathname + url.search)
      .expect(302);
    expect(res.headers.location).toMatch(/\/newsletter\/confirmed$/);
    expect((await row('mira@example.com'))?.confirmed_at).not.toBeNull();
  });

  it('does not email again once confirmed (same response, no enumeration)', async () => {
    const app = createApp(buildContainer({ mailer }));
    await request(app).post('/api/newsletter').send({ email: 'a@example.com' }).expect(200);
    const token = signToken('newsletter-confirm', 'a@example.com', secret, 60);
    await request(app).get(`/api/newsletter/confirm?token=${token}`).expect(302);
    sent.length = 0;
    const again = await request(app)
      .post('/api/newsletter')
      .send({ email: 'a@example.com' })
      .expect(200);
    expect(again.body).toEqual({ ok: true });
    expect(sent).toHaveLength(0);
  });

  it('unsubscribes from a signed link', async () => {
    const app = createApp(buildContainer({ mailer }));
    await request(app).post('/api/newsletter').send({ email: 'b@example.com' }).expect(200);
    const token = signToken('newsletter-unsubscribe', 'b@example.com', secret);
    const res = await request(app).get(`/api/newsletter/unsubscribe?token=${token}`).expect(302);
    expect(res.headers.location).toMatch(/\/newsletter\/unsubscribed$/);
    expect((await row('b@example.com'))?.unsubscribed_at).not.toBeNull();
  });

  it('sends bad, tampered, expired and wrong-purpose tokens to /newsletter/invalid', async () => {
    const app = createApp(buildContainer({ mailer }));
    await request(app).post('/api/newsletter').send({ email: 'c@example.com' }).expect(200);
    const good = signToken('newsletter-confirm', 'c@example.com', secret, 60);
    const expired = signToken('newsletter-confirm', 'c@example.com', secret, -5);
    const wrongPurpose = signToken('newsletter-unsubscribe', 'c@example.com', secret);
    for (const token of [`${good}x`, expired, 'garbage-token-value', wrongPurpose]) {
      const res = await request(app).get(`/api/newsletter/confirm?token=${token}`).expect(302);
      expect(res.headers.location).toMatch(/\/newsletter\/invalid$/);
    }
    const missing = await request(app).get('/api/newsletter/unsubscribe').expect(302);
    expect(missing.headers.location).toMatch(/\/newsletter\/invalid$/);
    expect((await row('c@example.com'))?.confirmed_at).toBeNull();
  });
});
