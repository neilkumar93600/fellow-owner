import { RETENTION_DAYS } from '@fellow-owners/shared';
import { sql } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { buildContainer } from '../../src/container.js';
import { createApp } from '../../src/create-app.js';
import { daysAgo, utcDayString } from '../../src/lib/dates.js';
import { contentHash } from '../../src/lib/hash.js';
import { createFactories } from '../helpers/factories.js';
import { closeDb, resetDatabase } from '../helpers/test-db.js';

const container = buildContainer();
const app = createApp(container);
const factories = createFactories(container);
const { repos, env } = container;

const AUTH = `Bearer ${env.CRON_SECRET}`;

afterAll(async () => {
  await closeDb();
});

describe('cron authentication', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  for (const path of ['/api/cron/refresh-followers', '/api/cron/purge']) {
    it(`rejects ${path} with no Authorization header`, async () => {
      const res = await request(app).post(path).expect(401);
      expect(res.body.error.code).toBe('unauthorized');
    });

    it(`rejects ${path} with the wrong secret`, async () => {
      await request(app).post(path).set('Authorization', 'Bearer not-the-secret').expect(401);
    });

    it(`rejects ${path} with the secret but no Bearer prefix`, async () => {
      await request(app).post(path).set('Authorization', env.CRON_SECRET).expect(401);
    });
  }
});

describe('GET|POST /api/cron/purge', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  /** A space with one expired and one still-current row for every retention rule. */
  async function seedRetentionFixtures() {
    const { space, ownerMembership } = await factories.space({ handle: 'retention' });
    const [room] = await repos.communities.listBySpace(space.id);
    if (!room) throw new Error('factory made no community');

    const expiredAt = daysAgo(RETENTION_DAYS.softDeleted + 1);
    const recentAt = daysAgo(RETENTION_DAYS.softDeleted - 1);

    // Posts: one soft-deleted long ago, one soft-deleted yesterday, one live.
    const makePost = async (title: string, deletedAt: Date | null) =>
      repos.posts.insert({
        spaceId: space.id,
        communityId: room.id,
        authorMembershipId: ownerMembership.id,
        type: 'idea',
        title,
        body: 'A gym log app that turns lifts into stats worth sharing.',
        contentHash: contentHash(title, 'body'),
        ...(deletedAt ? { deletedAt } : {}),
      });
    const expiredPost = await makePost('Expired soft-deleted post', expiredAt);
    const recentPost = await makePost('Recently soft-deleted post', recentAt);
    const livePost = await makePost('A post that is still here', null);

    await repos.comments.insertMany([
      {
        postId: livePost.id,
        spaceId: space.id,
        authorMembershipId: ownerMembership.id,
        body: 'expired',
        deletedAt: expiredAt,
      },
      {
        postId: livePost.id,
        spaceId: space.id,
        authorMembershipId: ownerMembership.id,
        body: 'recent',
        deletedAt: recentAt,
      },
      {
        postId: livePost.id,
        spaceId: space.id,
        authorMembershipId: ownerMembership.id,
        body: 'still here',
      },
    ]);

    const promotion = (
      await repos.promotions.insertMany([
        {
          spaceId: space.id,
          postId: livePost.id,
          shortCode: 'Cr0nTst1',
          showcaseSlug: 'cron-test',
          publishedAt: new Date(),
          createdByUserId: space.ownerUserId,
        },
      ])
    )[0];
    if (!promotion) throw new Error('promotion fixture failed');

    await repos.clicks.insertMany([
      {
        promotionId: promotion.id,
        platform: 'x',
        createdAt: daysAgo(RETENTION_DAYS.clickEvents + 1),
      },
      {
        promotionId: promotion.id,
        platform: 'x',
        createdAt: daysAgo(RETENTION_DAYS.clickEvents - 1),
      },
    ]);

    for (const days of [RETENTION_DAYS.aiRuns + 1, RETENTION_DAYS.aiRuns - 1]) {
      await repos.aiRuns.insert({
        spaceId: space.id,
        task: 'triageItem',
        model: 'test/model',
        status: 'ok',
        createdAt: daysAgo(days),
      });
    }

    for (const days of [RETENTION_DAYS.digests + 1, RETENTION_DAYS.digests - 1]) {
      await repos.digests.upsert({
        spaceId: space.id,
        communityId: null,
        periodDate: utcDayString(daysAgo(days)),
        content: { headline: 'test' },
        model: 'test/model',
      });
    }

    return { space, expiredPost, recentPost, livePost };
  }

  it('deletes exactly the rows past their retention rule', async () => {
    const { space, expiredPost, recentPost, livePost } = await seedRetentionFixtures();

    const res = await request(app).post('/api/cron/purge').set('Authorization', AUTH).expect(200);

    expect(res.body).toMatchObject({
      ok: true,
      posts: 1,
      comments: 1,
      clickEvents: 1,
      aiRuns: 1,
      digests: 1,
    });
    expect(res.body.cutoffs.softDeleted).toEqual(expect.any(String));

    // The expired post is gone; the one soft-deleted yesterday and the live one are not.
    expect(await repos.posts.findInSpace(space.id, expiredPost.id)).toBeNull();
    expect(await repos.posts.findInSpace(space.id, recentPost.id)).not.toBeNull();
    expect(await repos.posts.findInSpace(space.id, livePost.id)).not.toBeNull();

    const counts = await rowCounts(space.id);
    expect(counts).toEqual({ comments: 2, clicks: 1, aiRuns: 1, digests: 1 });
  });

  it('is idempotent: a second run finds nothing left to delete', async () => {
    await seedRetentionFixtures();
    await request(app).post('/api/cron/purge').set('Authorization', AUTH).expect(200);

    const second = await request(app)
      .post('/api/cron/purge')
      .set('Authorization', AUTH)
      .expect(200);
    expect(second.body).toMatchObject({
      ok: true,
      posts: 0,
      comments: 0,
      clickEvents: 0,
      aiRuns: 0,
      digests: 0,
    });
  });

  it('deletes read notifications after 90 days and keeps unread ones', async () => {
    const { space } = await factories.space({ handle: 'bell' });
    const note = (createdDaysAgo: number, read: boolean) =>
      repos.notifications.insert({
        userId: space.ownerUserId,
        spaceId: space.id,
        kind: 'project_featured',
        payload: { postId: space.id, title: 'x' },
        createdAt: daysAgo(createdDaysAgo),
        readAt: read ? daysAgo(createdDaysAgo) : null,
      });
    const expired = await note(91, true);
    const recent = await note(89, true);
    const unreadOld = await note(120, false);

    const res = await request(app).post('/api/cron/purge').set('Authorization', AUTH).expect(200);
    expect(res.body.notifications).toBe(1);
    const left = await container.db.execute<{ id: string }>(
      sql`select id from notifications where space_id = ${space.id}`,
    );
    expect(left.map((row) => row.id).sort()).toEqual([recent.id, unreadOld.id].sort());
    expect(left.map((row) => row.id)).not.toContain(expired.id);
  });

  it('answers GET as well, because that is what Vercel Cron sends', async () => {
    const res = await request(app).get('/api/cron/purge').set('Authorization', AUTH).expect(200);
    expect(res.body.ok).toBe(true);
    expect(res.headers['cache-control']).toBe('private, no-store');
  });

  it('leaves a database with nothing to purge alone', async () => {
    const res = await request(app).post('/api/cron/purge').set('Authorization', AUTH).expect(200);
    expect(res.body).toMatchObject({
      posts: 0,
      comments: 0,
      clickEvents: 0,
      aiRuns: 0,
      digests: 0,
    });
  });
});

describe('removed demo routes', () => {
  it('no longer serves the demo reset or the demo sign-in', async () => {
    await request(app).post('/api/cron/demo-reset').set('Authorization', AUTH).expect(404);
    await request(app).post('/api/demo/session').send({ as: 'fan' }).expect(404);
  });
});

// ---------------------------------------------------------------- helpers

/** Rows left in the tables the purge touches, for one space. */
async function rowCounts(spaceId: string) {
  const [row] = (await container.db.execute(sql`
    select
      (select count(*)::int from comments where space_id = ${spaceId}) as comments,
      (select count(*)::int from click_events c
         join promotions p on p.id = c.promotion_id
        where p.space_id = ${spaceId}) as clicks,
      (select count(*)::int from ai_runs where space_id = ${spaceId}) as ai_runs,
      (select count(*)::int from digests where space_id = ${spaceId}) as digests
  `)) as unknown as Array<{ comments: number; clicks: number; ai_runs: number; digests: number }>;
  return {
    comments: Number(row?.comments ?? 0),
    clicks: Number(row?.clicks ?? 0),
    aiRuns: Number(row?.ai_runs ?? 0),
    digests: Number(row?.digests ?? 0),
  };
}
