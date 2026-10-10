import { LIMITS } from '@fellow-owners/shared';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createFakeAiServices } from '../../src/ai/fake.js';
import { buildContainer } from '../../src/container.js';
import { createApp } from '../../src/create-app.js';
import { digests } from '../../src/db/schema/ai.js';
import type { CommunityRow } from '../../src/db/schema/communities.js';
import type { MembershipRow } from '../../src/db/schema/memberships.js';
import { memberships } from '../../src/db/schema/memberships.js';
import type { PostRow } from '../../src/db/schema/posts.js';
import { posts } from '../../src/db/schema/posts.js';
import { type SignedIn, signInWithOtp } from '../helpers/auth.js';
import { createFactories, type TestSpace } from '../helpers/factories.js';
import { closeDb, db, resetDatabase } from '../helpers/test-db.js';

const container = buildContainer();
const app = createApp(container);
const factories = createFactories(container);
const { repos } = container;

// Same database, AI that always fails: briefing `unavailable`, promotion draftErrors.
const failingApp = createApp(
  buildContainer({
    ai: createFakeAiServices({
      accounting: { aiRuns: repos.aiRuns },
      failTasks: { briefing: 'provider', promoteDrafts: 'provider' },
    }),
  }),
);

const DAY = 86_400_000;

let owner: SignedIn;
let mira: TestSpace;
let builders: CommunityRow;
let fitness: CommunityRow;
let arjun: MembershipRow;
let bea: MembershipRow;
let strongIdea: PostRow;
let weakIdea: PostRow;

const studio = (path: string, cookie = owner.cookie) =>
  request(app).get(`/api/studio${path}`).set('Cookie', cookie);

async function analyzeAll(): Promise<void> {
  await request(app).post('/api/studio/sweep').set('Cookie', owner.cookie).expect(200);
  await container.background.whenIdle();
}

beforeAll(async () => {
  await resetDatabase();
  owner = await signInWithOtp(app, 'mira@studio.test', 'Mira Lane');
  mira = await factories.space({
    owner: { id: owner.userId, email: owner.email, name: 'Mira Lane' },
    handle: 'mira',
    displayName: 'Mira Lane',
  });
  [builders, fitness] = mira.communities as [CommunityRow, CommunityRow];
  arjun = (
    await factories.member(mira.space.id, {
      communityIds: [builders.id, fitness.id],
      skills: ['react', 'figma'],
      headline: 'Frontend dev',
    })
  ).membership;
  bea = (await factories.member(mira.space.id, { communityIds: [fitness.id] })).membership;
  const old = (await factories.member(mira.space.id, { communityIds: [builders.id] })).membership;
  await db
    .update(memberships)
    .set({ joinedAt: new Date(Date.now() - 10 * DAY) })
    .where(eq(memberships.id, old.id));

  strongIdea = await factories.post(mira.space.id, builders.id, arjun.id, {
    title: 'Gym log app for creators',
    body: 'A fitness app for creators that turns lifts into shareable stats.',
  });
  weakIdea = await factories.post(mira.space.id, fitness.id, bea.id, {
    title: 'Crypto signals group',
    body: 'Guaranteed returns with crypto signals, double your money fast.',
  });
  await factories.post(mira.space.id, builders.id, arjun.id, {
    type: 'project',
    title: 'Last week project',
    rolesNeeded: ['Designer'],
    createdAt: new Date(Date.now() - 9 * DAY),
  });
  await factories.pitch(mira.space.id, bea.id, { type: 'collab' });
  await factories.pitch(mira.space.id, bea.id, {
    type: 'other',
    subject: 'Free followers giveaway',
    body: 'DM me on WhatsApp for free followers, click here to claim your prize now!',
  });
  await factories.pitch(mira.space.id, arjun.id, {
    type: 'other',
    subject: 'Paid integration for our luggage',
    body: 'We would like to pay you $3,000 for a sponsored integration of our luggage in two videos.',
  });
  await analyzeAll();
});

afterAll(async () => {
  await container.background.whenIdle();
  await closeDb();
});

describe('onboarding', () => {
  let newcomer: SignedIn;

  it('checks handles with reasons and suggestions', async () => {
    newcomer = await signInWithOtp(app, 'nina@studio.test', 'Nina');
    const free = await studio('/handle-check?handle=nina', newcomer.cookie).expect(200);
    expect(free.body).toEqual({ handle: 'nina', available: true, reason: null, suggestions: [] });
    const taken = await studio('/handle-check?handle=MIRA', newcomer.cookie).expect(200);
    expect(taken.body).toMatchObject({ handle: 'mira', available: false, reason: 'taken' });
    expect(taken.body.suggestions).toEqual(['mira_', 'mira.official', 'mira2']);
    const reserved = await studio('/handle-check?handle=dashboard', newcomer.cookie).expect(200);
    expect(reserved.body.reason).toBe('reserved');
    const invalid = await studio('/handle-check?handle=no', newcomer.cookie).expect(200);
    expect(invalid.body.reason).toBe('invalid');
    await request(app).get('/api/studio/handle-check?handle=nina').expect(401);
  });

  it('404s studio routes until the space exists', async () => {
    const res = await studio('/space', newcomer.cookie).expect(404);
    expect(res.body.error.code).toBe('not_found');
    await studio('/overview', newcomer.cookie).expect(404);
    await request(app).get('/api/studio/space').expect(401);
  });

  it('creates the space, owner membership and communities in one step', async () => {
    const body = {
      handle: 'nina',
      displayName: 'Nina Codes',
      bio: 'Code and climbing',
      platforms: [{ platform: 'youtube', url: 'https://youtube.com/@nina', followers: 1200 }],
      communities: [
        { name: 'Budget Travel', tint: 'lime', icon: 'globe' },
        { name: 'Budget Travel', tint: 'aqua', icon: 'rocket' },
      ],
      tasteProfile: { promote: ['climbing gear'], never: [], voice: [] },
    };
    const res = await request(app)
      .post('/api/studio/space')
      .set('Cookie', newcomer.cookie)
      .send(body)
      .expect(201);
    expect(res.body).toMatchObject({
      handle: 'nina',
      displayName: 'Nina Codes',
      totalFollowers: 1200,
      communityCount: 2,
      tasteVersion: 1,
      ownerName: 'Nina',
      memberCount: 0,
      isDemo: false,
    });
    const communities = await studio('/communities', newcomer.cookie).expect(200);
    expect(communities.body.map((c: { slug: string }) => c.slug)).toEqual([
      'budget-travel',
      'budget-travel-2',
    ]);
    const space = await repos.spaces.findByHandle('nina');
    expect((await repos.memberships.findOwner(space!.id))?.userId).toBe(newcomer.userId);

    const again = await request(app)
      .post('/api/studio/space')
      .set('Cookie', newcomer.cookie)
      .send({ ...body, handle: 'nina_two' })
      .expect(409);
    expect(again.body.error.code).toBe('conflict');

    const someone = await signInWithOtp(app, 'other@studio.test', 'Other');
    const taken = await request(app)
      .post('/api/studio/space')
      .set('Cookie', someone.cookie)
      .send(body)
      .expect(409);
    expect(taken.body.error).toMatchObject({
      code: 'handle_taken',
      details: { suggestions: ['nina_', 'nina.official', 'nina2'] },
    });
    const reserved = await request(app)
      .post('/api/studio/space')
      .set('Cookie', someone.cookie)
      .send({ ...body, handle: 'admin' })
      .expect(400);
    expect(reserved.body.error.code).toBe('validation_error');
  });
});

describe('Today', () => {
  it('computes the overview metrics', async () => {
    const res = await studio('/overview').expect(200);
    expect(res.body.stats.members).toEqual({ value: 3, previous: 1, changePct: 200 });
    expect(res.body.stats.ideasThisWeek).toEqual({ value: 2, previous: 1, changePct: 100 });
    expect(res.body.thisWeek.joins.total).toBe(3);
    expect(res.body.thisWeek.ideas.total).toBe(3);
    expect(res.body.thisWeek.pitches).toMatchObject({ total: 3, today: 3 });
    const mix = Object.fromEntries(
      res.body.inboxMix.map((s: { key: string; count: number }) => [s.key, s.count]),
    );
    expect(mix).toMatchObject({ spam: 1, collab: 1, brand_deal: 1 });
    expect(res.body.activity).toHaveLength(12);
    expect(res.body.activity.at(-1)).toMatchObject({ ideas: 2 });
    expect(res.body.pendingAnalysis).toBe(0);
    expect(res.body.aiPaused).toBe(false);
  });

  it('sweeps pending items in the background', async () => {
    const post = await factories.post(mira.space.id, builders.id, arjun.id);
    const res = await request(app)
      .post('/api/studio/sweep')
      .set('Cookie', owner.cookie)
      .expect(200);
    expect(res.body.claimed).toBeGreaterThanOrEqual(1);
    expect(res.body.remaining).toBeGreaterThanOrEqual(0);
    await container.background.whenIdle();
    expect((await repos.posts.findById(post.id))?.analysisStatus).toBe('done');
  });

  it('builds, caches and regenerates the briefing from candidates only', async () => {
    const first = await studio('/briefing').expect(200);
    expect(first.body).toMatchObject({ status: 'ready', regenerationsLeft: 5, model: 'fake' });
    expect(first.body.highlights.length).toBeGreaterThanOrEqual(LIMITS.briefing.highlights.min);
    for (const highlight of first.body.highlights) {
      expect(['post', 'inbound', 'membership']).toContain(highlight.refType);
      expect(highlight.href).toMatch(/^\/dashboard\/(ideas|inbox|people)\?item=/);
      expect(highlight.title.length).toBeGreaterThan(0);
    }
    const cached = await studio('/briefing').expect(200);
    expect(cached.body.id).toBe(first.body.id);

    let last = cached;
    for (let i = 0; i < LIMITS.briefing.regenerationsPerDay; i += 1) {
      last = await request(app)
        .post('/api/studio/briefing/regenerate')
        .set('Cookie', owner.cookie)
        .expect(200);
    }
    expect(last.body).toMatchObject({ id: first.body.id, regenerationsLeft: 0 });
    const capped = await request(app)
      .post('/api/studio/briefing/regenerate')
      .set('Cookie', owner.cookie)
      .expect(429);
    expect(capped.body.error.code).toBe('daily_cap_reached');
  });

  it('records feedback on highlights and items', async () => {
    const briefing = await studio('/briefing').expect(200);
    const refId = `${briefing.body.id}:0`;
    await request(app)
      .post('/api/studio/feedback')
      .set('Cookie', owner.cookie)
      .send({ refType: 'briefing_highlight', refId, verdict: 'up' })
      .expect(200);
    expect((await studio('/briefing').expect(200)).body.highlights[0].feedback).toBe('up');
    const cleared = await request(app)
      .post('/api/studio/feedback')
      .set('Cookie', owner.cookie)
      .send({ refType: 'briefing_highlight', refId, verdict: null })
      .expect(200);
    expect(cleared.body).toEqual({ refType: 'briefing_highlight', refId, verdict: null });
    await request(app)
      .post('/api/studio/feedback')
      .set('Cookie', owner.cookie)
      .send({ refType: 'post', refId: strongIdea.id, verdict: 'down' })
      .expect(200);
    expect((await studio(`/posts/${strongIdea.id}`).expect(200)).body.feedback).toBe('down');
    await request(app)
      .post('/api/studio/feedback')
      .set('Cookie', owner.cookie)
      .send({ refType: 'briefing_highlight', refId: `${briefing.body.id}:99`, verdict: 'up' })
      .expect(404);
  });

  it('answers unavailable (200, not cached) when the AI fails', async () => {
    await db.delete(digests).where(eq(digests.spaceId, mira.space.id));
    const res = await request(failingApp)
      .get('/api/studio/briefing')
      .set('Cookie', owner.cookie)
      .expect(200);
    expect(res.body).toMatchObject({
      status: 'unavailable',
      id: null,
      highlights: [],
      model: null,
    });
    expect(res.body.headline).toMatch(/new members?, \d+ ideas? and \d+ pitch(es)? this week/);
    expect(await repos.digests.findBriefing(mira.space.id, res.body.periodDate)).toBeNull();
  });
});

describe('inbox', () => {
  it('lists tabs with counts, fit sort and the filtered tab', async () => {
    const res = await studio('/inbox').expect(200);
    expect(res.body.counts).toMatchObject({ all: 2, collabs: 1, brand_deals: 1, filtered: 1 });
    expect(res.body.items).toHaveLength(2);
    const fits = res.body.items.map((i: { ai: { fitScore: number } }) => i.ai.fitScore);
    expect(fits).toEqual([...fits].sort((a: number, b: number) => b - a));
    expect(res.body.items[0].ai).toHaveProperty('fitReason');
    expect(JSON.stringify(res.body)).not.toContain('@example.com');

    const filtered = await studio('/inbox?tab=filtered').expect(200);
    expect(filtered.body.items).toHaveLength(1);
    expect(filtered.body.items[0]).toMatchObject({ isFiltered: true });
    const brandDeals = await studio('/inbox?tab=brand_deals').expect(200);
    expect(brandDeals.body.items[0]).toMatchObject({ type: 'other', recategorized: true });
    const search = await studio('/inbox?q=luggage').expect(200);
    expect(search.body.counts.all).toBe(1);
    const newest = await studio('/inbox?sort=newest&limit=1').expect(200);
    expect(newest.body.nextCursor).toEqual(expect.any(String));
    await studio(`/inbox?sort=fit&cursor=${newest.body.nextCursor}`).expect(400);
  });

  it('acts on a pitch: shortlist, reply, restore, rescore', async () => {
    const list = await studio('/inbox?tab=collabs').expect(200);
    const id = list.body.items[0].id;
    const detail = await studio(`/inbox/${id}`).expect(200);
    expect(detail.body.senderProfile).toMatchObject({
      pitchCount: 2,
      communities: [expect.any(Object)],
    });
    const act = (body: object) =>
      request(app).patch(`/api/studio/inbox/${id}`).set('Cookie', owner.cookie).send(body);
    expect(
      (await act({ action: 'set_status', status: 'shortlisted' }).expect(200)).body.status,
    ).toBe('shortlisted');
    const replied = await act({ action: 'reply', reply: 'Love it, let us talk.' }).expect(200);
    expect(replied.body).toMatchObject({
      status: 'replied',
      creatorReply: 'Love it, let us talk.',
    });
    const rescored = await act({ action: 'rescore' }).expect(200);
    expect(rescored.body.ai).toMatchObject({ status: 'pending', attempts: 0 });

    const spam = (await studio('/inbox?tab=filtered').expect(200)).body.items[0].id;
    const restored = await request(app)
      .patch(`/api/studio/inbox/${spam}`)
      .set('Cookie', owner.cookie)
      .send({ action: 'restore' })
      .expect(200);
    expect(restored.body.isFiltered).toBe(false);
    await container.background.whenIdle();
  });

  it('cannot reply to a withdrawn pitch', async () => {
    const pitch = await factories.pitch(mira.space.id, bea.id);
    await repos.pitches.withdraw(pitch.id, bea.id);
    const res = await request(app)
      .patch(`/api/studio/inbox/${pitch.id}`)
      .set('Cookie', owner.cookie)
      .send({ action: 'reply', reply: 'Hello' })
      .expect(409);
    expect(res.body.error.code).toBe('conflict');
  });
});

describe('ideas, posts and people', () => {
  it('ranks ideas by the idea score with community counts', async () => {
    const res = await studio('/ideas').expect(200);
    const ids = res.body.items.map((i: { id: string }) => i.id);
    expect(ids.indexOf(strongIdea.id)).toBeLessThan(ids.indexOf(weakIdea.id));
    const scores = res.body.items.map((i: { score: number }) => i.score);
    expect(scores).toEqual([...scores].sort((a: number, b: number) => b - a));
    expect(res.body.total).toBe(res.body.items.length);
    expect(res.body.counts.map((c: { slug: string }) => c.slug)).toEqual([
      'budget-travel',
      'solo-travelers',
    ]);
    const filtered = await studio('/ideas?community=solo-travelers').expect(200);
    expect(filtered.body.items.map((i: { id: string }) => i.id)).toEqual([weakIdea.id]);
    const projects = await studio('/ideas?type=project').expect(200);
    expect(projects.body.total).toBe(1);
    const page = await studio('/ideas?limit=1').expect(200);
    expect(page.body.nextCursor).toEqual(expect.any(String));
  });

  it('hides, unhides and rescores posts', async () => {
    const hide = await request(app)
      .patch(`/api/studio/posts/${weakIdea.id}`)
      .set('Cookie', owner.cookie)
      .send({ action: 'hide' })
      .expect(200);
    expect(hide.body.hidden).toBe(true);
    const ideas = await studio('/ideas').expect(200);
    expect(ideas.body.items.find((i: { id: string }) => i.id === weakIdea.id)?.hidden).toBe(true);
    await request(app)
      .patch(`/api/studio/posts/${weakIdea.id}`)
      .set('Cookie', owner.cookie)
      .send({ action: 'unhide' })
      .expect(200);
    const rescore = await request(app)
      .patch(`/api/studio/posts/${weakIdea.id}`)
      .set('Cookie', owner.cookie)
      .send({ action: 'rescore' })
      .expect(200);
    expect(rescore.body.ai.status).toBe('pending');
    await container.background.whenIdle();
  });

  it('lists people ranked by contributions, with search and removal', async () => {
    const res = await studio('/people').expect(200);
    expect(res.body.total).toBe(3);
    expect(res.body.items[0].membershipId).toBe(arjun.id);
    expect(res.body.rising[0].membershipId).toBe(arjun.id);
    expect(res.body.items[0]).not.toHaveProperty('email');
    expect((await studio('/people?q=figma').expect(200)).body.items).toHaveLength(1);
    expect((await studio('/people?community=solo-travelers').expect(200)).body.total).toBe(2);

    await request(app)
      .delete(`/api/studio/people/${mira.ownerMembership.id}`)
      .set('Cookie', owner.cookie)
      .expect(403);
    await request(app)
      .delete(`/api/studio/people/${bea.id}`)
      .set('Cookie', owner.cookie)
      .expect(204);
    expect((await studio('/people').expect(200)).body.total).toBe(2);
    expect((await repos.communities.findById(mira.space.id, fitness.id))?.memberCount).toBe(1);
  });
});

describe('communities', () => {
  it('creates, renames, archives and details communities', async () => {
    const created = await request(app)
      .post('/api/studio/communities')
      .set('Cookie', owner.cookie)
      .send({ name: 'Music & Creators', tint: 'aqua', icon: 'music' })
      .expect(201);
    expect(created.body).toMatchObject({
      slug: 'music-and-creators',
      archivedAt: null,
      postCount: 0,
    });
    await request(app)
      .post('/api/studio/communities')
      .set('Cookie', owner.cookie)
      .send({ name: 'Music', slug: 'music-and-creators', tint: 'aqua', icon: 'music' })
      .expect(409);
    const archived = await request(app)
      .patch(`/api/studio/communities/${created.body.id}`)
      .set('Cookie', owner.cookie)
      .send({ name: 'Music', archived: true })
      .expect(200);
    expect(archived.body).toMatchObject({ name: 'Music', slug: 'music-and-creators' });
    expect(archived.body.archivedAt).toEqual(expect.any(String));
    const page = await request(app).get('/api/spaces/mira').expect(200);
    expect(page.body.communities.map((c: { slug: string }) => c.slug)).not.toContain(
      'music-and-creators',
    );
    const detail = await studio('/communities/budget-travel').expect(200);
    expect(detail.body.community).toMatchObject({ slug: 'budget-travel', postsThisWeek: 2 });
    expect(detail.body.posts.length).toBeGreaterThan(0);
    expect(detail.body.members.length).toBeGreaterThan(0);
    await studio('/communities/nope').expect(404);
  });

  it('caps a space at 20 communities', async () => {
    const existing = await repos.communities.countBySpace(mira.space.id);
    for (let i = existing; i < LIMITS.community.perSpace.max; i += 1) {
      await repos.communities.insert({
        spaceId: mira.space.id,
        slug: `extra-${i}`,
        name: `Extra ${i}`,
      });
    }
    await request(app)
      .post('/api/studio/communities')
      .set('Cookie', owner.cookie)
      .send({ name: 'One too many', tint: 'white', icon: 'users' })
      .expect(409);
  });
});

describe('promotions', () => {
  it('creates drafts, publishes and unpublishes', async () => {
    const created = await request(app)
      .post('/api/studio/promotions')
      .set('Cookie', owner.cookie)
      .send({ postId: strongIdea.id })
      .expect(201);
    expect(created.body).toMatchObject({ state: 'draft', draftErrors: [], shortPath: null });
    expect(Object.keys(created.body.drafts).sort()).toEqual([
      'instagram',
      'linkedin',
      'x',
      'youtube',
    ]);
    expect(created.body.drafts.x.text.length).toBeLessThanOrEqual(LIMITS.promotion.text.x);
    const again = await request(app)
      .post('/api/studio/promotions')
      .set('Cookie', owner.cookie)
      .send({ postId: strongIdea.id })
      .expect(200);
    expect(again.body.id).toBe(created.body.id);

    const published = await request(app)
      .patch(`/api/studio/promotions/${created.body.id}`)
      .set('Cookie', owner.cookie)
      .send({ action: 'publish' })
      .expect(200);
    expect(published.body).toMatchObject({
      state: 'live',
      showcaseSlug: 'gym-log-app-for-creators',
      showcasePath: '/mira/s/gym-log-app-for-creators',
    });
    expect(published.body.shortCode).toMatch(/^[0-9A-Za-z]{8}$/);
    expect(published.body.shortPath).toBe(`/r/${published.body.shortCode}`);
    expect((await repos.posts.findById(strongIdea.id))?.featuredAt).not.toBeNull();

    const composer = await studio(`/promotions/post/${strongIdea.id}`).expect(200);
    expect(composer.body.promotion.id).toBe(created.body.id);
    expect(composer.body.post.promotion).toEqual({ id: created.body.id, state: 'live' });

    const unpublished = await request(app)
      .patch(`/api/studio/promotions/${created.body.id}`)
      .set('Cookie', owner.cookie)
      .send({ action: 'unpublish' })
      .expect(200);
    expect(unpublished.body.state).toBe('unpublished');
    expect((await repos.posts.findById(strongIdea.id))?.featuredAt).toBeNull();

    const list = await studio('/promotions').expect(200);
    expect(list.body.counts).toEqual({ draft: 0, live: 0, unpublished: 1 });
  });

  it('records draftErrors when the AI fails and needs a draft to publish', async () => {
    const post = await factories.post(mira.space.id, builders.id, arjun.id, {
      title: 'Another promotable idea',
    });
    const created = await request(failingApp)
      .post('/api/studio/promotions')
      .set('Cookie', owner.cookie)
      .send({ postId: post.id })
      .expect(201);
    expect(created.body.drafts).toEqual({});
    expect(created.body.draftErrors.sort()).toEqual(['instagram', 'linkedin', 'x', 'youtube']);
    await request(app)
      .patch(`/api/studio/promotions/${created.body.id}`)
      .set('Cookie', owner.cookie)
      .send({ action: 'publish' })
      .expect(409);
    const saved = await request(app)
      .patch(`/api/studio/promotions/${created.body.id}`)
      .set('Cookie', owner.cookie)
      .send({
        action: 'save',
        headline: 'Fresh',
        drafts: { x: { text: 'Look!', hashtags: ['#a'] } },
      })
      .expect(200);
    expect(saved.body).toMatchObject({
      headline: 'Fresh',
      drafts: { x: { text: 'Look!', hashtags: ['a'] } },
    });
    expect(saved.body.draftErrors).not.toContain('x');
    await request(app)
      .patch(`/api/studio/promotions/${created.body.id}`)
      .set('Cookie', owner.cookie)
      .send({ action: 'publish' })
      .expect(200);
  });

  it('refuses hidden or deleted posts', async () => {
    const hidden = await factories.post(mira.space.id, builders.id, arjun.id);
    await repos.posts.setHidden(mira.space.id, hidden.id, true);
    await request(app)
      .post('/api/studio/promotions')
      .set('Cookie', owner.cookie)
      .send({ postId: hidden.id })
      .expect(409);
    const deleted = await factories.post(mira.space.id, builders.id, arjun.id);
    await db.update(posts).set({ deletedAt: new Date() }).where(eq(posts.id, deleted.id));
    await request(app)
      .post('/api/studio/promotions')
      .set('Cookie', owner.cookie)
      .send({ postId: deleted.id })
      .expect(404);
  });
});

describe('settings', () => {
  it('bumps the taste version and marks old scores stale', async () => {
    const res = await request(app)
      .put('/api/studio/settings')
      .set('Cookie', owner.cookie)
      .send({ tasteProfile: { promote: ['dashboards'], never: [], voice: [] } })
      .expect(200);
    expect(res.body).toMatchObject({ tasteVersion: 2, tasteProfile: { promote: ['dashboards'] } });
    const post = await studio(`/posts/${strongIdea.id}`).expect(200);
    expect(post.body.ai.stale).toBe(true);
    const profile = await request(app)
      .put('/api/studio/settings')
      .set('Cookie', owner.cookie)
      .send({ profile: { displayName: 'Mira K', bio: null, platforms: [] } })
      .expect(200);
    expect(profile.body).toMatchObject({ displayName: 'Mira K', bio: null, tasteVersion: 2 });
    await request(app).put('/api/studio/settings').set('Cookie', owner.cookie).send({}).expect(400);
  });

  it('keeps members out of the studio', async () => {
    const fan = await signInWithOtp(app, 'fan@studio.test', 'Fan');
    await factories.member(mira.space.id, {
      user: { id: fan.userId, email: fan.email, name: 'Fan' },
    });
    await studio('/inbox', fan.cookie).expect(404);
    await studio('/space', fan.cookie).expect(404);
  });
});
