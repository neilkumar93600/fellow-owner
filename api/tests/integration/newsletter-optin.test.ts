import { sql } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { env } from '../../src/config/env.js';
import { buildContainer } from '../../src/container.js';
import { createApp } from '../../src/create-app.js';
import type { MailMessage } from '../../src/lib/mailer.js';
import { signToken } from '../../src/lib/signed-token.js';
import { NEWSLETTER_CONFIRMS_PER_DAY } from '../../src/services/newsletter.service.js';
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
// Each test posts from its own client IP: the per-IP sign-up limiter is shared by the file.
let ipSeq = 0;
function subscribe(app: ReturnType<typeof createApp>, email: string) {
  ipSeq += 1;
  return request(app)
    .post('/api/newsletter')
    .set('X-Forwarded-For', `198.51.100.${ipSeq}`)
    .send({ email });
}

describe('newsletter double opt-in', () => {
  beforeEach(async () => {
    sent.length = 0;
    await db.execute(sql`delete from newsletter_subscribers`);
  });

  afterAll(async () => {
    await closeDb();
  });

  it('emails a link to the web confirm page; only the POST from its button confirms', async () => {
    const app = createApp(buildContainer({ mailer }));
    await subscribe(app, 'Mira@Example.com').expect(200);
    expect(sent).toHaveLength(1);
    expect(sent[0]?.to).toBe('mira@example.com');
    const link = sent[0]?.text.match(/https?:\/\/\S+\/newsletter\/confirm\?token=\S+/)?.[0];
    expect(link?.startsWith(`${env.WEB_ORIGIN}/newsletter/confirm?token=`)).toBe(true);
    const token = new URL(link ?? '').searchParams.get('token') ?? '';

    // A link scanner GETting the API link (older emails) is only sent to the page.
    const scanned = await request(app).get(`/api/newsletter/confirm?token=${token}`).expect(302);
    expect(scanned.headers.location).toBe(
      `${env.WEB_ORIGIN}/newsletter/confirm?token=${encodeURIComponent(token)}`,
    );
    expect((await row('mira@example.com'))?.confirmed_at).toBeNull();

    const res = await request(app)
      .post(`/api/newsletter/confirm?token=${encodeURIComponent(token)}`)
      .expect(200);
    expect(res.body).toEqual({ status: 'confirmed' });
    expect((await row('mira@example.com'))?.confirmed_at).not.toBeNull();
  });

  it('does not email again once confirmed (same response, no enumeration)', async () => {
    const app = createApp(buildContainer({ mailer }));
    await subscribe(app, 'a@example.com').expect(200);
    const token = signToken('newsletter-confirm', 'a@example.com', secret, 60);
    await request(app).post(`/api/newsletter/confirm?token=${token}`).expect(200);
    sent.length = 0;
    const again = await subscribe(app, 'a@example.com').expect(200);
    expect(again.body).toEqual({ ok: true });
    expect(sent).toHaveLength(0);
  });

  it('sends one confirm email per address per 24 h, whatever the IP', async () => {
    const app = createApp(buildContainer({ mailer }));
    for (let i = 0; i < 3; i++) await subscribe(app, 'd@example.com').expect(200);
    expect(sent).toHaveLength(1);
    await db.execute(
      sql`update newsletter_subscribers set confirm_sent_at = now() - interval '25 hours' where email = 'd@example.com'`,
    );
    await subscribe(app, 'd@example.com').expect(200);
    expect(sent).toHaveLength(2);
  });

  it('unsubscribes from the page button and from an RFC 8058 one-click POST, never from a GET', async () => {
    const app = createApp(buildContainer({ mailer }));
    await subscribe(app, 'b@example.com').expect(200);
    const header = sent[0]?.headers?.['List-Unsubscribe'] ?? '';
    expect(sent[0]?.headers?.['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click');
    const oneClick = new URL(header.slice(1, -1));
    expect(oneClick.pathname).toBe('/api/newsletter/unsubscribe');

    const scanned = await request(app)
      .get(oneClick.pathname + oneClick.search)
      .expect(302);
    expect(scanned.headers.location).toMatch(/\/newsletter\/unsubscribe\?token=/);
    expect((await row('b@example.com'))?.unsubscribed_at).toBeNull();

    const res = await request(app)
      .post(oneClick.pathname + oneClick.search)
      .type('form')
      .send('List-Unsubscribe=One-Click')
      .expect(200);
    expect(res.body).toEqual({ status: 'unsubscribed' });
    expect((await row('b@example.com'))?.unsubscribed_at).not.toBeNull();
  });

  it('answers 400 to bad, tampered, expired and wrong-purpose tokens and changes nothing', async () => {
    const app = createApp(buildContainer({ mailer }));
    await subscribe(app, 'c@example.com').expect(200);
    const good = signToken('newsletter-confirm', 'c@example.com', secret, 60);
    const expired = signToken('newsletter-confirm', 'c@example.com', secret, -5);
    const wrongPurpose = signToken('newsletter-unsubscribe', 'c@example.com', secret);
    for (const token of [`${good}x`, expired, 'garbage-token-value', wrongPurpose]) {
      await request(app).post(`/api/newsletter/confirm?token=${token}`).expect(400);
    }
    await request(app).post('/api/newsletter/unsubscribe').expect(400);
    expect(await row('c@example.com')).toMatchObject({ confirmed_at: null, unsubscribed_at: null });
  });

  it(`sends at most ${NEWSLETTER_CONFIRMS_PER_DAY} confirm emails a day in all`, async () => {
    const container = buildContainer({ mailer });
    for (let i = 0; i < NEWSLETTER_CONFIRMS_PER_DAY + 3; i++) {
      await container.services.newsletter.subscribe(`bulk${i}@example.com`, 'footer');
    }
    // Earlier tests in this file used a few of the day's emails (one in-process counter).
    expect(sent.length).toBeLessThan(NEWSLETTER_CONFIRMS_PER_DAY);
    expect(sent.length).toBeGreaterThan(NEWSLETTER_CONFIRMS_PER_DAY - 15);
    const [count] = await db.execute<{ n: number }>(
      sql`select count(*)::int as n from newsletter_subscribers`,
    );
    expect(count?.n).toBe(NEWSLETTER_CONFIRMS_PER_DAY + 3);
  });
});
