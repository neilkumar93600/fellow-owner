import { LIMITS } from '@fellow-owners/shared';
import { eq, sql } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { buildContainer } from '../../src/container.js';
import { createApp } from '../../src/create-app.js';
import { notificationPrefs } from '../../src/db/schema/notification-prefs.js';
import type { MailMessage } from '../../src/lib/mailer.js';
import { signToken } from '../../src/lib/signed-token.js';
import { signInWithOtp } from '../helpers/auth.js';
import { createFactories, type TestSpace, type TestUser } from '../helpers/factories.js';
import { closeDb, db, resetDatabase } from '../helpers/test-db.js';

const sent: MailMessage[] = [];
let failFor: string | null = null;
const container = buildContainer({
  mailer: {
    async send(message) {
      if (failFor && message.to === failFor) throw new Error('boom');
      sent.push(message);
    },
  },
});
const app = createApp(container);
const factories = createFactories(container);
const { notificationEmails } = container.services;
const { repos, env } = container;

const NOW = new Date('2026-10-12T12:00:00Z');
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000);
const minutesAgo = (m: number) => new Date(NOW.getTime() - m * 60_000);

let mira: TestSpace;
let fan: TestUser;

async function notify(
  user: TestUser,
  kind: 'reply_received' | 'project_featured' | 'spotlighted' | 'comment_received',
  createdAt: Date,
  title = 'Gym log',
) {
  const payload =
    kind === 'reply_received'
      ? { inboundId: crypto.randomUUID(), subject: title }
      : kind === 'project_featured'
        ? { postId: crypto.randomUUID(), title }
        : kind === 'spotlighted'
          ? { note: 'hi' }
          : {
              postId: crypto.randomUUID(),
              title,
              actorName: 'Sam',
              commentId: crypto.randomUUID(),
            };
  return repos.notifications.insert({
    userId: user.id,
    spaceId: mira.space.id,
    kind,
    payload,
    createdAt,
  });
}

async function newFan(email: string): Promise<TestUser> {
  return factories.user({ email, name: 'Priya Shah' });
}

beforeEach(async () => {
  await resetDatabase();
  sent.length = 0;
  failFor = null;
  mira = await factories.space({ displayName: 'Mira Lane', handle: 'mira' });
  fan = await newFan('priya@fellow-test.dev');
});

afterAll(async () => {
  await closeDb();
});

describe('sendDue', () => {
  it('sends one digest per user with every unread notification, with unsubscribe headers', async () => {
    await notify(fan, 'reply_received', hoursAgo(3), 'Budget Rome');
    await notify(fan, 'reply_received', hoursAgo(2), 'Solo Lisbon');
    await notify(fan, 'project_featured', hoursAgo(1), 'Gym log');

    expect(await notificationEmails.sendDue(NOW)).toBe(1);

    expect(sent).toHaveLength(1);
    const mail = sent[0] as MailMessage;
    expect(mail.to).toBe('priya@fellow-test.dev');
    expect(mail.subject).toContain('3');
    expect(mail.text).toContain('Mira Lane replied to your idea: Budget Rome');
    expect(mail.text).toContain('Mira Lane replied to your idea: Solo Lisbon');
    expect(mail.text).toContain('Mira Lane featured your fan project: Gym log');
    expect(mail.text).toContain(`${env.WEB_ORIGIN}/mira/me?tab=pitches`);
    expect(mail.text).toContain('/api/email/unsubscribe?token=');
    expect(mail.headers?.['List-Unsubscribe']).toMatch(
      /^<http.*\/api\/email\/unsubscribe\?token=.+>$/,
    );
    expect(mail.headers?.['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click');
  });

  it('never re-sends, and the next digest holds only what is new', async () => {
    await notify(fan, 'reply_received', hoursAgo(3), 'First');
    expect(await notificationEmails.sendDue(NOW)).toBe(1);
    expect(await notificationEmails.sendDue(NOW)).toBe(0);

    const later = new Date(NOW.getTime() + 3_600_000);
    await notify(fan, 'spotlighted', NOW);
    expect(await notificationEmails.sendDue(later)).toBe(1);
    expect(sent).toHaveLength(2);
    expect(sent[1]?.text).toContain('shout-out');
    expect(sent[1]?.text).not.toContain('First');
  });

  it('leaves notifications younger than 10 minutes for the next run, without losing them', async () => {
    await notify(fan, 'reply_received', hoursAgo(1), 'Old');
    await notify(fan, 'reply_received', minutesAgo(5), 'Fresh');

    expect(await notificationEmails.sendDue(NOW)).toBe(1);
    expect(sent[0]?.text).toContain('Old');
    expect(sent[0]?.text).not.toContain('Fresh');

    expect(await notificationEmails.sendDue(new Date(NOW.getTime() + 3_600_000))).toBe(1);
    expect(sent[1]?.text).toContain('Fresh');
  });

  it('skips read notifications and kinds that are not emailed', async () => {
    const read = await notify(fan, 'reply_received', hoursAgo(2), 'Already read');
    await repos.notifications.markRead(fan.id, { ids: [read.id] });
    await notify(fan, 'comment_received', hoursAgo(2));

    expect(await notificationEmails.sendDue(NOW)).toBe(0);
    expect(sent).toHaveLength(0);
  });

  it('respects the master switch and each kind', async () => {
    const other = await newFan('arjun@fellow-test.dev');
    await notify(fan, 'reply_received', hoursAgo(2), 'Replies off');
    await notify(fan, 'spotlighted', hoursAgo(2));
    await notificationEmails.updatePrefs(fan.id, {
      emailEnabled: true,
      kinds: { reply_received: false },
    });
    await notify(other, 'reply_received', hoursAgo(2), 'Everything off');
    await notificationEmails.updatePrefs(other.id, { emailEnabled: false, kinds: {} });

    expect(await notificationEmails.sendDue(NOW)).toBe(1);
    expect(sent).toHaveLength(1);
    expect(sent[0]?.to).toBe('priya@fellow-test.dev');
    expect(sent[0]?.text).toContain('shout-out');
    expect(sent[0]?.text).not.toContain('Replies off');
  });

  it('never emails example.com addresses (demo and seed users)', async () => {
    const demo = await newFan('priya@example.com');
    await notify(demo, 'reply_received', hoursAgo(2));
    expect(await notificationEmails.sendDue(NOW)).toBe(0);
    expect(sent).toHaveLength(0);
  });

  it('caps the lines in one email and says how many more there are', async () => {
    const total = LIMITS.emails.digestMaxItems + 2;
    for (let i = 0; i < total; i++) await notify(fan, 'reply_received', hoursAgo(2), `Idea ${i}`);

    await notificationEmails.sendDue(NOW);
    const lines = (sent[0]?.text ?? '').split('\n').filter((l) => l.startsWith('- '));
    expect(lines).toHaveLength(LIMITS.emails.digestMaxItems);
    expect(sent[0]?.text).toContain('and 2 more');
    expect(sent[0]?.subject).toContain(String(total));
  });

  it('a failed send does not stop other users and is retried next run', async () => {
    const other = await newFan('arjun@fellow-test.dev');
    await notify(fan, 'reply_received', hoursAgo(2), 'Mine');
    await notify(other, 'reply_received', hoursAgo(2), 'Theirs');
    failFor = 'priya@fellow-test.dev';

    expect(await notificationEmails.sendDue(NOW)).toBe(1);
    expect(sent.map((m) => m.to)).toEqual(['arjun@fellow-test.dev']);

    failFor = null;
    expect(await notificationEmails.sendDue(NOW)).toBe(1);
    expect(sent.map((m) => m.to)).toEqual(['arjun@fellow-test.dev', 'priya@fellow-test.dev']);
  });

  it('does not email a backlog older than a week', async () => {
    await notify(fan, 'reply_received', new Date(NOW.getTime() - 20 * 86_400_000));
    expect(await notificationEmails.sendDue(NOW)).toBe(0);
  });
});

describe('unsubscribe', () => {
  const link = (userId: string, purpose = 'email-unsubscribe') =>
    `/api/email/unsubscribe?token=${encodeURIComponent(signToken(purpose, userId, env.BETTER_AUTH_SECRET))}`;

  it('a signed link unsubscribes the user, with a redirect to the preferences page', async () => {
    await notify(fan, 'reply_received', hoursAgo(2));
    const res = await request(app).get(link(fan.id)).expect(302);
    expect(res.headers.location).toBe(`${env.WEB_ORIGIN}/email-preferences?status=unsubscribed`);

    const [row] = await db
      .select()
      .from(notificationPrefs)
      .where(eq(notificationPrefs.userId, fan.id));
    expect(row?.unsubscribedAt).toBeInstanceOf(Date);
    expect(await notificationEmails.sendDue(NOW)).toBe(0);
    expect((await notificationEmails.getPrefs(fan.id)).unsubscribed).toBe(true);
  });

  it('answers the mail client one-click POST with 200', async () => {
    await request(app)
      .post(link(fan.id))
      .type('form')
      .send('List-Unsubscribe=One-Click')
      .expect(200);
    expect((await notificationEmails.getPrefs(fan.id)).unsubscribed).toBe(true);
  });

  it('a tampered token, another purpose or a deleted user is invalid', async () => {
    for (const url of [
      `${link(fan.id)}x`,
      link(fan.id, 'newsletter-unsubscribe'),
      link('no-such-user'),
    ]) {
      const res = await request(app).get(url).expect(302);
      expect(res.headers.location).toBe(`${env.WEB_ORIGIN}/email-preferences?status=invalid`);
    }
    expect((await notificationEmails.getPrefs(fan.id)).unsubscribed).toBe(false);
    await request(app).get('/api/email/unsubscribe').expect(400);
  });

  it('the link in a sent digest works', async () => {
    await notify(fan, 'reply_received', hoursAgo(2));
    await notificationEmails.sendDue(NOW);
    const url = (sent[0]?.text.match(/https?:\/\/\S+\/api\/email\/unsubscribe\?token=\S+/) ??
      [])[0];
    expect(url).toBeTruthy();
    const res = await request(app).get(
      new URL(url as string).pathname + new URL(url as string).search,
    );
    expect(res.status).toBe(302);
    expect((await notificationEmails.getPrefs(fan.id)).unsubscribed).toBe(true);
  });
});

describe('GET/PUT /api/me/notification-prefs', () => {
  it('needs a session', async () => {
    await request(app).get('/api/me/notification-prefs').expect(401);
    await request(app)
      .put('/api/me/notification-prefs')
      .send({ emailEnabled: true, kinds: {} })
      .expect(401);
  });

  it('defaults to everything on, and a change round-trips', async () => {
    const me = await signInWithOtp(app, 'rosa@example.com', 'Rosa');
    const first = await request(app).get('/api/me/notification-prefs').set('Cookie', me.cookie);
    expect(first.status).toBe(200);
    expect(first.body).toEqual({
      emailEnabled: true,
      kinds: {
        reply_received: true,
        project_featured: true,
        spotlighted: true,
        challenge_shortlisted: true,
        team_decision: true,
      },
      unsubscribed: false,
    });

    const put = await request(app)
      .put('/api/me/notification-prefs')
      .set('Cookie', me.cookie)
      .send({ emailEnabled: true, kinds: { spotlighted: false } })
      .expect(200);
    expect(put.body.kinds.spotlighted).toBe(false);
    expect(put.body.kinds.reply_received).toBe(true);

    const again = await request(app).get('/api/me/notification-prefs').set('Cookie', me.cookie);
    expect(again.body).toEqual(put.body);

    await request(app)
      .put('/api/me/notification-prefs')
      .set('Cookie', me.cookie)
      .send({ emailEnabled: true, kinds: { bogus: false } })
      .expect(400);
  });

  it('turning emails back on clears an earlier unsubscribe', async () => {
    const me = await signInWithOtp(app, 'rosa@example.com', 'Rosa');
    await notificationEmails.unsubscribe(
      signToken('email-unsubscribe', me.userId, env.BETTER_AUTH_SECRET),
    );
    const off = await request(app).get('/api/me/notification-prefs').set('Cookie', me.cookie);
    expect(off.body).toMatchObject({ emailEnabled: false, unsubscribed: true });

    const on = await request(app)
      .put('/api/me/notification-prefs')
      .set('Cookie', me.cookie)
      .send({ emailEnabled: true, kinds: {} })
      .expect(200);
    expect(on.body).toMatchObject({ emailEnabled: true, unsubscribed: false });
    const rows = await db.execute(
      sql`select unsubscribed_at from notification_prefs where user_id = ${me.userId}`,
    );
    expect(rows[0]?.unsubscribed_at).toBeNull();
  });
});
