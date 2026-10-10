import { eq } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildContainer } from '../../src/container.js';
import { createApp } from '../../src/create-app.js';
import { aiFeedback } from '../../src/db/schema/ai.js';
import type { CommunityRow } from '../../src/db/schema/communities.js';
import { memberships } from '../../src/db/schema/memberships.js';
import { pageVisits } from '../../src/db/schema/page-visits.js';
import { promotions } from '../../src/db/schema/promotions.js';
import { utcDayString } from '../../src/lib/dates.js';
import { withinCap } from '../../src/middlewares/rate-limit.js';
import { VISITS_PER_SPACE_PER_DAY } from '../../src/services/metrics.service.js';
import { type SignedIn, signInWithOtp } from '../helpers/auth.js';
import { createFactories, type TestSpace } from '../helpers/factories.js';
import { closeDb, db, resetDatabase } from '../helpers/test-db.js';

const container = buildContainer();
const app = createApp(container);
const factories = createFactories(container);
const { repos } = container;

const DAY = 86_400_000;
const ago = (days: number) => new Date(Date.now() - days * DAY);
const BROWSER = 'Mozilla/5.0 (Macintosh) AppleWebKit/605.1.15 Safari/605.1.15';

let owner: SignedIn;
let mira: TestSpace;
let community: CommunityRow;
let otherOwner: SignedIn;

const visit = (handle: string, ip: string, userAgent = BROWSER) =>
  request(app)
    .post(`/api/spaces/${handle}/visit`)
    .set('X-Real-IP', ip)
    .set('User-Agent', userAgent);
const metrics = (days: number | string, cookie = owner.cookie) =>
  request(app).get(`/api/studio/metrics?days=${days}`).set('Cookie', cookie);

beforeAll(async () => {
  await resetDatabase();
  owner = await signInWithOtp(app, 'mira@metrics.test', 'Mira Lane');
  otherOwner = await signInWithOtp(app, 'zed@metrics.test', 'Zed Park');
  mira = await factories.space({
    owner: { id: owner.userId, email: owner.email, name: 'Mira Lane' },
    handle: 'mira',
    displayName: 'Mira Lane',
  });
  community = mira.communities[0] as CommunityRow;
  await factories.space({
    owner: { id: otherOwner.userId, email: otherOwner.email, name: 'Zed Park' },
    handle: 'zed',
    displayName: 'Zed Park',
  });
});
afterAll(async () => {
  await container.background.whenIdle();
  await closeDb();
});

describe('POST /api/spaces/:handle/visit', () => {
  it('counts one visitor per day and increments visits', async () => {
    await visit('mira', '198.51.100.1').expect(204);
    await visit('mira', '198.51.100.1').expect(204);
    await visit('mira', '198.51.100.2').expect(204);
    const rows = await db.select().from(pageVisits).where(eq(pageVisits.spaceId, mira.space.id));
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.visits).sort()).toEqual([1, 2]);
    expect(rows.every((r) => r.day === utcDayString())).toBe(true);
    expect(rows.every((r) => !r.visitorHash.includes('198.51.100'))).toBe(true);
    const res = await metrics(7).expect(200);
    expect(res.body.bioVisitors.value).toBe(2);
  });

  it('ignores bots and missing user agents', async () => {
    const before = await db.select().from(pageVisits);
    await visit('mira', '198.51.100.9', 'Googlebot/2.1').expect(204);
    await request(app).post('/api/spaces/mira/visit').set('X-Real-IP', '198.51.100.10').expect(204);
    expect(await db.select().from(pageVisits)).toHaveLength(before.length);
  });

  it('answers 404 for an unknown handle', async () => {
    await visit('nobody-here', '198.51.100.11').expect(404);
  });

  it('limits one IP to 30 visits a minute', async () => {
    for (let i = 0; i < 30; i += 1) await visit('mira', '198.51.100.50').expect(204);
    await visit('mira', '198.51.100.50').expect(429);
  });

  it(`records at most ${VISITS_PER_SPACE_PER_DAY} visits per space a day, whatever the IPs`, async () => {
    const zed = await repos.spaces.findByHandle('zed');
    const key = `${zed?.id}:${utcDayString()}`;
    for (let i = 0; i < VISITS_PER_SPACE_PER_DAY; i += 1) {
      await withinCap({
        name: 'visit-space',
        key,
        windowSeconds: 86_400,
        max: VISITS_PER_SPACE_PER_DAY,
        redis: null,
      });
    }
    await visit('zed', '198.51.100.60').expect(204);
    const rows = await db
      .select()
      .from(pageVisits)
      .where(eq(pageVisits.spaceId, zed?.id ?? ''));
    expect(rows).toHaveLength(0);
  });
});

describe('GET /api/studio/metrics', () => {
  it('needs an owner and a valid window', async () => {
    await request(app).get('/api/studio/metrics').expect(401);
    await metrics(5).expect(400);
  });

  it('shows another owner nothing of this space', async () => {
    const res = await metrics(30, otherOwner.cookie).expect(200);
    expect(res.body.bioVisitors.value).toBe(0);
    expect(res.body.joins.value).toBe(0);
    expect(res.body.joinRate).toBeNull();
  });

  it('computes the numbers from seeded rows', async () => {
    await db.delete(pageVisits);
    const today = utcDayString();
    const rows = (days: number, n: number, tag: string) =>
      Array.from({ length: n }, (_, i) => ({
        spaceId: mira.space.id,
        visitorHash: `${tag}-${i}`,
        day: utcDayString(ago(days)),
        visits: 2,
      }));
    // 4 visitors in the current 7-day window, 2 in the one before, 1 far outside both.
    await db
      .insert(pageVisits)
      .values([...rows(0, 2, 'a'), ...rows(3, 2, 'b'), ...rows(9, 2, 'c'), ...rows(20, 1, 'd')]);
    expect(today).toBe(utcDayString());

    // joins: 2 this week, 1 the week before (plus the owner, who never counts)
    await factories.member(mira.space.id, { communityIds: [community.id] });
    await factories.member(mira.space.id, { communityIds: [community.id] });
    const old = await factories.member(mira.space.id, { communityIds: [community.id] });
    await db
      .update(memberships)
      .set({ joinedAt: ago(9) })
      .where(eq(memberships.id, old.membership.id));

    // ai feedback: 3 up, 1 down
    await db.insert(aiFeedback).values(
      (['up', 'up', 'up', 'down'] as const).map((verdict, i) => ({
        spaceId: mira.space.id,
        refType: 'post' as const,
        refId: `ref-${i}`,
        verdict,
        createdByUserId: owner.userId,
      })),
    );

    // collabs: one project with 2 accepted members, one with only its lead, one with a requested second
    const author = (await factories.member(mira.space.id, { communityIds: [community.id] }))
      .membership;
    const helper = (await factories.member(mira.space.id, { communityIds: [community.id] }))
      .membership;
    const team = await factories.post(mira.space.id, community.id, author.id, { type: 'project' });
    await repos.teams.insert({
      postId: team.id,
      membershipId: helper.id,
      role: 'Designer',
      status: 'accepted',
    });
    const solo = await factories.post(mira.space.id, community.id, author.id, { type: 'project' });
    await repos.teams.insert({
      postId: solo.id,
      membershipId: helper.id,
      role: 'Designer',
      status: 'requested',
    });

    // promotions: 3 published this week
    for (let i = 0; i < 3; i += 1) {
      const p = await factories.post(mira.space.id, community.id, author.id);
      await db.insert(promotions).values({
        spaceId: mira.space.id,
        postId: p.id,
        createdByUserId: owner.userId,
        publishedAt: ago(1),
      });
    }

    const res = await metrics(7).expect(200);
    expect(res.body.days).toBe(7);
    expect(res.body.bioVisitors).toEqual({ value: 4, previous: 2, changePct: 100 });
    // 2 seeded + the 2 members above for collabs/promotions also joined this week
    expect(res.body.joins.value).toBe(4);
    expect(res.body.joins.previous).toBe(1);
    expect(res.body.joinRate).toBe(1);
    expect(res.body.aiAgreement).toEqual({ up: 3, down: 1, rate: 0.75 });
    expect(res.body.collabs).toBe(1);
    expect(res.body.promotionsPerWeek).toBe(3);

    const month = await metrics(30).expect(200);
    expect(month.body.bioVisitors.value).toBe(7);
    expect(month.body.promotionsPerWeek).toBe(0.7);
  });

  it('defaults to 30 days and gives a null rate when nobody visited', async () => {
    expect((await metrics(30)).body.days).toBe(30);
    await db.delete(pageVisits);
    const res = await request(app)
      .get('/api/studio/metrics')
      .set('Cookie', owner.cookie)
      .expect(200);
    expect(res.body.days).toBe(30);
    expect(res.body.joinRate).toBeNull();
    expect(res.body.bioVisitors.changePct).toBeNull();
  });
});
