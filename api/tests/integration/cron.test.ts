import { RETENTION_DAYS } from '@fellow-owners/shared';
import { sql } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { buildContainer } from '../../src/container.js';
import { createApp } from '../../src/create-app.js';
import type { SeedData } from '../../src/db/seed/seed.js';
import { readSeedData } from '../../src/db/seed/seed.js';
import { daysAgo, utcDayString } from '../../src/lib/dates.js';
import { contentHash } from '../../src/lib/hash.js';
import { resetDemo } from '../../src/workers/demo-reset.js';
import { createFactories } from '../helpers/factories.js';
import { closeDb, resetDatabase } from '../helpers/test-db.js';

const container = buildContainer();
const app = createApp(container);
const factories = createFactories(container);
const { repos, env } = container;

const AUTH = `Bearer ${env.CRON_SECRET}`;

/** Same database, demo mode off: the 403 path for the demo reset. */
const demoOff = buildContainer({ env: { ...env, DEMO_ENABLED: false } });

/**
 * A tiny stand-in for data/*.json. The real file has 1,200 members, which is the right size for a
 * demo and the wrong size for a test that only needs to prove the reseed happened.
 */
const SMALL_SEED: SeedData = {
  space: {
    handle: 'mira',
    displayName: 'Mira Lane',
    bio: 'Small tools, heavy-ish things.',
    avatarUrl: null,
    platforms: [{ platform: 'youtube', url: 'https://youtube.com/@miralane', followers: 410_000 }],
    tasteProfile: { promote: ['small tools'], never: ['crypto'], voice: [] },
  },
  communities: [
    {
      slug: 'budget-travel',
      name: 'Budget Travel',
      description: null,
      tint: 'peach',
      icon: 'globe',
    },
  ],
  members: [
    {
      name: 'Priya Shah',
      email: 'priya@example.com',
      headline: 'Frontend engineer who lifts',
      intro: null,
      skills: ['react'],
      links: [],
      communities: ['budget-travel'],
      joinedDaysAgo: 10,
      isDemoFan: true,
    },
    {
      name: 'Dev Sharma',
      email: 'dev@example.com',
      headline: null,
      intro: null,
      skills: [],
      links: [],
      communities: ['budget-travel'],
      joinedDaysAgo: 4,
    },
  ],
  posts: [
    {
      community: 'budget-travel',
      authorIndex: 1,
      type: 'idea',
      title: 'A gym log app for solo developers',
      body: 'A gym log app that turns lifts into stats worth sharing. One screen, one input.',
      status: 'open',
      rolesNeeded: [],
      links: [],
      createdDaysAgo: 3,
      signals: { use: [0], build: [] },
      team: [],
      ai: {
        summary: 'A gym log app for solo developers',
        category: 'idea',
        fitScore: 78,
        fitReason: 'Matches "small tools".',
        tags: ['tools'],
        skills: ['typescript'],
        isSpam: false,
      },
    },
  ],
  comments: [{ postIndex: 0, authorIndex: 0, body: 'Strong yes from me.', createdDaysAgo: 2 }],
  pitches: [
    {
      senderIndex: 0,
      type: 'collab',
      subject: 'Six-week build-along with our team',
      body: 'You set a brief, we build alongside your audience for six weeks, everything stays public.',
      links: [],
      status: 'new',
      isFiltered: false,
      creatorReply: null,
      createdDaysAgo: 1,
      ai: {
        summary: 'Six-week build-along',
        category: 'collab',
        fitScore: 71,
        fitReason: 'Has a deadline and a named owner.',
        tags: ['collaboration'],
        skills: [],
        isSpam: false,
      },
    },
  ],
  promotions: [],
};

afterAll(async () => {
  await closeDb();
});

describe('cron authentication', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  for (const path of ['/api/cron/demo-reset', '/api/cron/purge']) {
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

describe('demo reset', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('builds the demo space from the seed data', async () => {
    const { deleted, seeded } = await resetDemo(container, { data: SMALL_SEED });

    expect(deleted).toBe(0);
    expect(seeded.handle).toBe('mira');
    expect(seeded.members).toBe(2);
    expect(seeded.posts).toBe(1);

    const [space] = await repos.spaces.listDemo();
    expect(space?.handle).toBe('mira');
    expect(space?.isDemo).toBe(true);

    // The fan account the demo signs into is a real member with real content.
    const fan = await repos.memberships.findByUser(space?.id ?? '', (await fanUserId()) ?? '');
    expect(fan?.headline).toBe('Frontend engineer who lifts');
  });

  // Two full resets back to back, so it gets twice the budget of a one-reset test.
  it('replaces the previous demo space instead of adding a second one', async () => {
    const first = await resetDemo(container, { data: SMALL_SEED });
    const second = await resetDemo(container, { data: SMALL_SEED });

    expect(second.deleted).toBe(1);
    expect(second.seeded.spaceId).not.toBe(first.seeded.spaceId);
    expect(await repos.spaces.listDemo()).toHaveLength(1);

    // Counters are rebuilt, not doubled.
    const counts = await rowCounts(second.seeded.spaceId);
    expect(counts.comments).toBe(1);
  }, 60_000);

  it('leaves spaces that are not the demo alone', async () => {
    const real = await factories.space({ handle: 'someoneelse' });
    await resetDemo(container, { data: SMALL_SEED });

    expect(await repos.spaces.findByHandle('someoneelse')).not.toBeNull();
    expect(await repos.spaces.findById(real.space.id)).not.toBeNull();
  });

  it('refuses when DEMO_ENABLED=false', async () => {
    await expect(resetDemo(demoOff, { data: SMALL_SEED })).rejects.toMatchObject({
      code: 'demo_disabled',
    });
    expect(await repos.spaces.listDemo()).toHaveLength(0);
  });
});

describe('GET|POST /api/cron/demo-reset', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  // The only test that loads the committed data/*.json: it proves the files parse, satisfy every
  // database constraint and reach the documented volumes. Slow on a remote database, which is why
  // every other reset test above injects SMALL_SEED instead.
  it('reseeds from the committed seed files', async () => {
    const res = await request(app)
      .post('/api/cron/demo-reset')
      .set('Authorization', AUTH)
      .expect(200);

    const data = await readSeedData();
    expect(res.body.ok).toBe(true);
    expect(res.body.seeded).toMatchObject({
      handle: data.space.handle,
      communities: data.communities.length,
      members: data.members.length,
      posts: data.posts.length,
      pitches: data.pitches.length,
    });
    expect(await repos.spaces.listDemo()).toHaveLength(1);
  }, 180_000);
});

// ---------------------------------------------------------------- helpers

async function fanUserId(): Promise<string | undefined> {
  const ctx = await container.auth.$context;
  const found = await ctx.internalAdapter.findUserByEmail(env.DEMO_FAN_EMAIL);
  return found?.user.id;
}

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
