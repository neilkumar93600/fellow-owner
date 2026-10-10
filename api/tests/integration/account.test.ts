import type { AccountExport } from '@fellow-owners/shared';
import { eq, sql } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { peekOtp } from '../../src/auth/email.js';
import { buildContainer } from '../../src/container.js';
import { createApp } from '../../src/create-app.js';
import { session, user, verification } from '../../src/db/schema/auth.js';
import type { CommunityRow } from '../../src/db/schema/communities.js';
import { communities } from '../../src/db/schema/communities.js';
import { inbound } from '../../src/db/schema/inbound.js';
import { jobRuns } from '../../src/db/schema/jobs.js';
import { notifications } from '../../src/db/schema/later.js';
import { memberships } from '../../src/db/schema/memberships.js';
import { pageVisits } from '../../src/db/schema/page-visits.js';
import { posts } from '../../src/db/schema/posts.js';
import { questionGroups } from '../../src/db/schema/question-groups.js';
import { spaces } from '../../src/db/schema/spaces.js';
import { supportRequests } from '../../src/db/schema/support.js';
import { daysAgo, utcDayString } from '../../src/lib/dates.js';
import { purgeExpired } from '../../src/workers/purge.js';
import { type SignedIn, signInAsDemo, signInWithOtp, TEST_ORIGIN } from '../helpers/auth.js';
import { createFactories, type TestSpace } from '../helpers/factories.js';
import { closeDb, resetDatabase } from '../helpers/test-db.js';

const container = buildContainer();
const app = createApp(container);
const factories = createFactories(container);
const { db, repos } = container;

/** The two-step delete: request the emailed code, then send it back. */
async function deleteAccount(who: SignedIn) {
  const first = await request(app)
    .post('/api/auth/delete-user')
    .set('Origin', TEST_ORIGIN)
    .set('Cookie', who.cookie)
    .send({})
    .expect(200);
  expect(first.body.message).toBe('Verification email sent');
  const code = peekOtp(who.email);
  if (!code) throw new Error('no delete code captured');
  return request(app)
    .post('/api/auth/delete-user')
    .set('Origin', TEST_ORIGIN)
    .set('Cookie', who.cookie)
    .send({ token: code });
}

let mira: TestSpace;
let owner: SignedIn;
let priya: SignedIn;
let raj: SignedIn;
let community: CommunityRow;
let priyaMembershipId: string;

beforeAll(async () => {
  await resetDatabase();
  owner = await signInWithOtp(app, 'mira@account.test', 'Mira Lane');
  mira = await factories.space({
    handle: 'mira',
    owner: { id: owner.userId, email: owner.email, name: 'Mira Lane' },
  });
  community = mira.communities[0] as CommunityRow;
  priya = await signInWithOtp(app, 'priya@account.test', 'Priya Shah');
  raj = await signInWithOtp(app, 'raj@account.test', 'Raj Patel');
  const p = await factories.member(mira.space.id, {
    user: { id: priya.userId, email: priya.email, name: 'Priya Shah' },
    communityIds: [community.id],
    intro: 'Priya maps night markets.',
  });
  priyaMembershipId = p.membership.id;
  const r = await factories.member(mira.space.id, {
    user: { id: raj.userId, email: raj.email, name: 'Raj Patel' },
    communityIds: [community.id],
  });
  await factories.post(mira.space.id, community.id, p.membership.id, { title: 'Priya idea' });
  await factories.post(mira.space.id, community.id, r.membership.id, { title: 'Raj secret idea' });
  await factories.pitch(mira.space.id, p.membership.id, { subject: 'Priya pitch' });
  await factories.pitch(mira.space.id, r.membership.id, { subject: 'Raj private pitch' });
});
afterAll(async () => {
  await container.background.whenIdle();
  await closeDb();
});

describe('GET /api/me/export', () => {
  it('needs a session', async () => {
    await request(app).get('/api/me/export').expect(401);
  });

  it("returns the caller's own rows only, as a download", async () => {
    const res = await request(app).get('/api/me/export').set('Cookie', priya.cookie).expect(200);
    expect(res.headers['content-disposition']).toContain('attachment');
    const data = res.body as AccountExport;
    expect(data.user).toMatchObject({ id: priya.userId, email: priya.email, name: 'Priya Shah' });
    expect(data.ownedSpaces).toEqual([]);
    expect(data.memberships).toHaveLength(1);
    expect(data.posts).toEqual([expect.objectContaining({ title: 'Priya idea' })]);
    expect(data.pitches).toEqual([expect.objectContaining({ subject: 'Priya pitch' })]);
    const text = JSON.stringify(data);
    expect(text).not.toContain('Raj');
    expect(text).not.toContain(raj.email);
    expect(text).not.toContain('embedding');
  });

  it("gives the owner their space but not their fans' rows", async () => {
    const res = await request(app).get('/api/me/export').set('Cookie', owner.cookie).expect(200);
    const data = res.body as AccountExport;
    expect(data.ownedSpaces).toEqual([expect.objectContaining({ handle: 'mira' })]);
    expect(data.posts).toEqual([]);
    expect(data.pitches).toEqual([]);
    expect(JSON.stringify(data)).not.toContain('Priya');
  });
});

describe('account deletion', () => {
  it('keeps a deleted fan’s posts as "Former member" and puts the counters right', async () => {
    const ownerPost = await factories.post(mira.space.id, community.id, mira.ownerMembership.id, {
      title: 'Mira asks',
    });
    await factories.signal(ownerPost.id, priyaMembershipId, 'use');
    await repos.comments.create({
      postId: ownerPost.id,
      spaceId: mira.space.id,
      authorMembershipId: priyaMembershipId,
      body: 'I would use this every week.',
    });
    const [pitch] = await db
      .select({ id: inbound.id })
      .from(inbound)
      .where(eq(inbound.senderMembershipId, priyaMembershipId));
    const [group] = await db
      .insert(questionGroups)
      .values({
        spaceId: mira.space.id,
        question: 'Where to eat cheap?',
        askedCount: 1,
        firstAskedAt: new Date(),
        lastAskedAt: new Date(),
      })
      .returning();
    await db
      .update(inbound)
      .set({ questionGroupId: group?.id })
      .where(eq(inbound.id, pitch?.id as string));
    const membersBefore = (
      await db.select().from(communities).where(eq(communities.id, community.id))
    )[0]?.memberCount as number;

    const res = await deleteAccount(priya);
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('User deleted');

    expect(await db.select().from(user).where(eq(user.id, priya.userId))).toEqual([]);
    const [kept] = await db.select().from(posts).where(eq(posts.title, 'Priya idea'));
    expect(kept?.authorMembershipId).toBeNull();
    const [counted] = await db.select().from(posts).where(eq(posts.id, ownerPost.id));
    expect(counted?.useCount).toBe(0);
    expect(counted?.commentCount).toBe(1);
    const [regrouped] = await db
      .select()
      .from(questionGroups)
      .where(eq(questionGroups.id, group?.id as string));
    expect(regrouped?.askedCount).toBe(0);
    const [after] = await db.select().from(communities).where(eq(communities.id, community.id));
    expect(after?.memberCount).toBe(membersBefore - 1);

    // The post page names the author "Former member".
    const detail = await request(app)
      .get(`/api/posts/${kept?.id}`)
      .set('Cookie', raj.cookie)
      .expect(200);
    const text = JSON.stringify(detail.body);
    expect(text).toContain('Former member');
    expect(text).not.toContain('Priya Shah');
  });

  it('deletes the space of an owner who deletes their account', async () => {
    const solo = await signInWithOtp(app, 'solo@account.test', 'Solo Owner');
    const own = await factories.space({
      handle: 'solo',
      owner: { id: solo.userId, email: solo.email, name: 'Solo Owner' },
    });
    const res = await deleteAccount(solo);
    expect(res.status).toBe(200);
    expect(await db.select().from(spaces).where(eq(spaces.id, own.space.id))).toEqual([]);
  });

  it('refuses a wrong code and keeps the account', async () => {
    await request(app)
      .post('/api/auth/delete-user')
      .set('Origin', TEST_ORIGIN)
      .set('Cookie', raj.cookie)
      .send({ token: 'not-the-code' })
      .expect(404);
    expect(await db.select().from(user).where(eq(user.id, raj.userId))).toHaveLength(1);
  });

  it('keeps the demo accounts', async () => {
    const demo = await signInAsDemo(container, 'fan');
    const res = await request(app)
      .post('/api/auth/delete-user')
      .set('Origin', TEST_ORIGIN)
      .set('Cookie', demo.cookie)
      .send({});
    expect(res.status).toBe(403);
  });
});

describe('retention purge (account rules)', () => {
  it('removes each new class past its rule and keeps fresh rows', async () => {
    const now = new Date();
    const fresh = await factories.space();
    const someone = await factories.user();
    const oldDay = (days: number) => utcDayString(daysAgo(days, now));

    await db.insert(session).values([
      {
        id: 'expired-session',
        token: 'expired-token',
        userId: someone.id,
        expiresAt: daysAgo(1, now),
        updatedAt: now,
      },
      {
        id: 'live-session',
        token: 'live-token',
        userId: someone.id,
        expiresAt: new Date(now.getTime() + 86_400_000),
        updatedAt: now,
      },
    ]);
    await db.insert(verification).values([
      { id: 'v-old', identifier: 'old', value: 'x', expiresAt: daysAgo(1, now) },
      { id: 'v-new', identifier: 'new', value: 'x', expiresAt: new Date(now.getTime() + 600_000) },
    ]);
    const note = (days: number) => ({
      userId: someone.id,
      spaceId: fresh.space.id,
      kind: 'project_featured' as const,
      payload: {},
      createdAt: daysAgo(days, now),
    });
    await db.insert(notifications).values([note(181), note(179)]);
    await db.insert(supportRequests).values([
      {
        kind: 'contact',
        email: 'a@b.test',
        message: 'An old support message.',
        createdAt: daysAgo(366, now),
      },
      {
        kind: 'contact',
        email: 'a@b.test',
        message: 'A fresh support message.',
        createdAt: daysAgo(364, now),
      },
    ]);
    await db.insert(pageVisits).values([
      { spaceId: fresh.space.id, visitorHash: 'a', day: oldDay(401) },
      { spaceId: fresh.space.id, visitorHash: 'a', day: oldDay(399) },
    ]);
    const gone = await factories.member(fresh.space.id, { intro: 'Old intro', skills: ['Design'] });
    const recent = await factories.member(fresh.space.id, { intro: 'Recent intro' });
    await db
      .update(memberships)
      .set({ removedAt: daysAgo(31, now) })
      .where(eq(memberships.id, gone.membership.id));
    await db
      .update(memberships)
      .set({ removedAt: daysAgo(29, now) })
      .where(eq(memberships.id, recent.membership.id));
    await db.insert(jobRuns).values([
      { job: 'sweep', slot: daysAgo(31, now), startedAt: daysAgo(31, now), status: 'ok' },
      { job: 'sweep', slot: daysAgo(29, now), startedAt: daysAgo(29, now), status: 'ok' },
    ]);

    const result = await purgeExpired(container, now);
    expect(result).toMatchObject({
      sessions: 1,
      verifications: 1,
      unreadNotifications: 1,
      supportRequests: 1,
      pageVisits: 1,
      removedMemberProfiles: 1,
      jobRuns: 1,
    });

    expect((await db.select({ id: session.id }).from(session)).map((r) => r.id)).toContain(
      'live-session',
    );
    expect((await db.select({ id: session.id }).from(session)).map((r) => r.id)).not.toContain(
      'expired-session',
    );
    const [wiped] = await db
      .select()
      .from(memberships)
      .where(eq(memberships.id, gone.membership.id));
    expect(wiped).toMatchObject({ intro: null, skills: [], links: [] });
    const [kept] = await db
      .select()
      .from(memberships)
      .where(eq(memberships.id, recent.membership.id));
    expect(kept?.intro).toBe('Recent intro');
    const counts = await db.execute<{ n: number }>(sql`
      select (select count(*) from support_requests)::int
           + (select count(*) from page_visits)::int
           + (select count(*) from job_runs)::int as n`);
    expect(counts[0]?.n).toBe(3);

    // A second run has nothing left to do.
    const again = await purgeExpired(container, now);
    expect(again).toMatchObject({
      sessions: 0,
      verifications: 0,
      unreadNotifications: 0,
      supportRequests: 0,
      pageVisits: 0,
      removedMemberProfiles: 0,
      jobRuns: 0,
    });
  });
});
