import { eq } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildContainer } from '../../src/container.js';
import { createApp } from '../../src/create-app.js';
import { clickEvents } from '../../src/db/schema/promotions.js';
import { createFactories, type TestSpace } from '../helpers/factories.js';
import { closeDb, db, resetDatabase } from '../helpers/test-db.js';

const container = buildContainer();
const app = createApp(container);
const factories = createFactories(container);
const { repos } = container;

let mira: TestSpace;
let liveCode: string;
let liveSlug: string;
let postId: string;

beforeAll(async () => {
  await resetDatabase();
  mira = await factories.space({
    handle: 'mira',
    displayName: 'Mira Kapoor',
    communities: [
      { name: 'Builders', slug: 'builders', tint: 'lime', icon: 'code-2' },
      { name: 'Fitness Crew', slug: 'fitness-crew', tint: 'peach', icon: 'dumbbell' },
      { name: 'Old', slug: 'old' },
    ],
  });
  await repos.spaces.update(mira.space.id, {
    platforms: [
      { platform: 'youtube', url: 'https://youtube.com/@mira', followers: 410_000 },
      { platform: 'x', url: 'https://x.com/mira', followers: 70_000 },
    ],
  });
  const [builders, , old] = mira.communities;
  await repos.communities.update(mira.space.id, old!.id, { archivedAt: new Date() });

  const arjun = await factories.member(mira.space.id, { communityIds: [builders!.id] });
  const bea = await factories.member(mira.space.id, { communityIds: [builders!.id] });
  const project = await factories.post(mira.space.id, builders!.id, arjun.membership.id, {
    type: 'project',
    title: 'Gym log app for creators',
    rolesNeeded: ['Designer', 'Backend dev'],
  });
  postId = project.id;
  await repos.teams.insert({
    postId,
    membershipId: bea.membership.id,
    role: 'Designer',
    status: 'accepted',
  });

  const { row } = await repos.promotions.insertDraft({
    spaceId: mira.space.id,
    postId,
    createdByUserId: mira.owner.id,
    headline: 'Built by the Builders',
    drafts: { x: { text: 'Look at this', hashtags: [] } },
  });
  const published = await repos.promotions.publish(mira.space.id, row.id, {
    showcaseSlug: 'gym-log-app',
    shortCode: 'Ab3dE9xY',
  });
  await repos.posts.setFeatured(mira.space.id, postId, true);
  liveCode = published!.shortCode!;
  liveSlug = published!.showcaseSlug!;
});

afterAll(async () => {
  await container.background.whenIdle();
  await closeDb();
});

describe('GET /api/spaces/:handle', () => {
  it('returns the bio page, CDN-cacheable and without cookies', async () => {
    const res = await request(app).get('/api/spaces/MIRA').expect(200);
    expect(res.headers['cache-control']).toBe('public, s-maxage=60, stale-while-revalidate=300');
    expect(res.headers['set-cookie']).toBeUndefined();
    expect(res.body.space).toMatchObject({
      handle: 'mira',
      displayName: 'Mira Kapoor',
      totalFollowers: 480_000,
      memberCount: 2,
    });
    expect(res.body.space).not.toHaveProperty('tasteProfile');
    expect(res.body.communities.map((c: { slug: string }) => c.slug)).toEqual([
      'builders',
      'fitness-crew',
    ]);
    expect(res.body.communities[0]).toMatchObject({ memberCount: 2, sortOrder: 0 });
    expect(res.body.featured).toEqual([
      expect.objectContaining({
        showcaseSlug: 'gym-log-app',
        postId,
        title: 'Gym log app for creators',
        headline: 'Built by the Builders',
        type: 'project',
        communityName: 'Builders',
        tint: 'lime',
        teamSize: 2,
      }),
    ]);
  });

  it('404s an unknown handle', async () => {
    const res = await request(app).get('/api/spaces/nobody_here').expect(404);
    expect(res.body.error.code).toBe('not_found');
  });
});

describe('GET /api/spaces/:handle/showcase/:slug', () => {
  it('shows a live promotion with the accepted team only', async () => {
    const res = await request(app).get(`/api/spaces/mira/showcase/${liveSlug}`).expect(200);
    expect(res.body.promotion).toMatchObject({ showcaseSlug: liveSlug, live: true });
    expect(res.body.post).toMatchObject({
      id: postId,
      type: 'project',
      openRoles: ['Backend dev'],
      community: { slug: 'builders', name: 'Builders', tint: 'lime', icon: 'code-2' },
    });
    expect(res.body.post).not.toHaveProperty('ai');
    expect(res.body.team.map((m: { role: string }) => m.role)).toEqual(['Lead', 'Designer']);
    expect(JSON.stringify(res.body)).not.toContain('@example.com');
  });

  it('404s an unknown slug', async () => {
    await request(app).get('/api/spaces/mira/showcase/nope').expect(404);
  });
});

describe('GET /r/:code', () => {
  it('redirects to the showcase and records the click without the raw IP', async () => {
    const res = await request(app)
      .get(`/r/${liveCode}?p=x`)
      .set('User-Agent', 'Mozilla/5.0')
      .set('Referer', 'https://t.co/some/path?q=1')
      .expect(302);
    expect(res.headers.location).toBe(`http://localhost:3000/mira/s/${liveSlug}`);
    expect(res.headers['cache-control']).toContain('no-store');

    const clicks = await db.select().from(clickEvents);
    expect(clicks).toHaveLength(1);
    expect(clicks[0]).toMatchObject({ platform: 'x', referrerHost: 't.co' });
    expect(clicks[0]!.visitorHash).toMatch(/^[0-9a-f]{64}$/);
    const promotion = await repos.promotions.findByShortCode(liveCode);
    expect(promotion?.promotion.clickCount).toBe(1);
  });

  it('files an unknown ?p= under other and skips link-preview bots', async () => {
    await request(app).get(`/r/${liveCode}?p=myspace`).set('User-Agent', 'Mozilla/5.0').expect(302);
    await request(app).get(`/r/${liveCode}?p=x`).set('User-Agent', 'Twitterbot/1.0').expect(302);
    const clicks = await db.select().from(clickEvents);
    expect(clicks.map((c) => c.platform).sort()).toEqual(['other', 'x']);
  });

  it('sends unknown or malformed codes home', async () => {
    const unknown = await request(app).get('/r/ZZZZZZZZ').expect(302);
    expect(unknown.headers.location).toBe('http://localhost:3000/');
    const malformed = await request(app)
      .get(`/r/${'x'.repeat(40)}`)
      .expect(302);
    expect(malformed.headers.location).toBe('http://localhost:3000/');
  });

  it('still redirects an unpublished promotion but stops counting and featuring', async () => {
    const found = await repos.promotions.findByShortCode(liveCode);
    await repos.promotions.unpublish(mira.space.id, found!.promotion.id);
    await repos.posts.setFeatured(mira.space.id, postId, false);
    const before = await db
      .select()
      .from(clickEvents)
      .where(eq(clickEvents.promotionId, found!.promotion.id));

    const res = await request(app).get(`/r/${liveCode}`).set('User-Agent', 'Mozilla/5.0');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe(`http://localhost:3000/mira/s/${liveSlug}`);
    const after = await db
      .select()
      .from(clickEvents)
      .where(eq(clickEvents.promotionId, found!.promotion.id));
    expect(after).toHaveLength(before.length);

    const showcase = await request(app).get(`/api/spaces/mira/showcase/${liveSlug}`).expect(200);
    expect(showcase.body).toMatchObject({ promotion: { live: false }, post: null, team: [] });
    const page = await request(app).get('/api/spaces/mira').expect(200);
    expect(page.body.featured).toEqual([]);
  });
});
