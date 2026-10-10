import { DAILY_CAPS, HOURLY_CAPS } from '@fellow-owners/shared';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createFakeAiServices } from '../../src/ai/fake.js';
import { buildContainer } from '../../src/container.js';
import { createApp } from '../../src/create-app.js';
import type { CommunityRow } from '../../src/db/schema/communities.js';
import { type SignedIn, signInWithOtp } from '../helpers/auth.js';
import { createFactories, type TestSpace } from '../helpers/factories.js';
import { closeDb, resetDatabase } from '../helpers/test-db.js';

const container = buildContainer();
const app = createApp(container);
const factories = createFactories(container);
const { repos } = container;

// Same database, AI that always fails: the degraded paths.
const failing = buildContainer({
  ai: createFakeAiServices({
    accounting: { aiRuns: repos.aiRuns },
    failTasks: { suggestCommunities: 'provider' },
  }),
});
const failingApp = createApp(failing);

let owner: SignedIn;
let fan: SignedIn;
let other: SignedIn;
let mira: TestSpace;
let builders: CommunityRow;
let fitness: CommunityRow;

const postBody = (communityId: string, overrides: Record<string, unknown> = {}) => ({
  communityId,
  type: 'idea',
  title: 'Gym log app for creators',
  body: 'An app that turns your lifts into shareable stats for your audience.',
  rolesNeeded: [],
  links: [],
  ...overrides,
});

const pitchBody = {
  type: 'collab',
  subject: 'Partnership on a fitness campaign',
  body: 'We would love to partner with you on a fitness campaign for creators next month.',
  links: [],
};

beforeAll(async () => {
  await resetDatabase();
  owner = await signInWithOtp(app, 'mira@spaces.test', 'Mira Lane');
  fan = await signInWithOtp(app, 'arjun@spaces.test', 'Arjun Mehta');
  other = await signInWithOtp(app, 'cal@spaces.test', '');
  mira = await factories.space({
    owner: { id: owner.userId, email: owner.email, name: 'Mira Lane' },
    handle: 'mira',
  });
  [builders, fitness] = mira.communities as [CommunityRow, CommunityRow];
});

afterAll(async () => {
  await container.background.whenIdle();
  await closeDb();
});

describe('GET /api/spaces/:handle/membership', () => {
  it('works signed out', async () => {
    const res = await request(app).get('/api/spaces/mira/membership').expect(200);
    expect(res.body).toEqual({ signedIn: false, isOwner: false, membership: null });
    expect(res.headers['cache-control']).toContain('no-store');
  });

  it('knows the owner and non-members', async () => {
    const asOwner = await request(app)
      .get('/api/spaces/mira/membership')
      .set('Cookie', owner.cookie)
      .expect(200);
    expect(asOwner.body).toMatchObject({ signedIn: true, isOwner: true });
    expect(asOwner.body.membership.role).toBe('owner');
    const asFan = await request(app)
      .get('/api/spaces/mira/membership')
      .set('Cookie', fan.cookie)
      .expect(200);
    expect(asFan.body).toEqual({ signedIn: true, isOwner: false, membership: null });
  });
});

describe('POST /api/spaces/:handle/suggest-communities', () => {
  it('suggests communities from the intro', async () => {
    const res = await request(app)
      .post('/api/spaces/mira/suggest-communities')
      .set('Cookie', fan.cookie)
      .send({ intro: 'solo traveler who loves street food' })
      .expect(200);
    expect(res.body.available).toBe(true);
    expect(res.body.suggestions.map((s: { slug: string }) => s.slug)).toContain('budget-travel');
    for (const suggestion of res.body.suggestions) {
      expect(suggestion.confidence).toBeGreaterThanOrEqual(0);
      expect(suggestion.confidence).toBeLessThanOrEqual(1);
      expect(mira.communities.map((c) => c.id)).toContain(suggestion.communityId);
    }
  });

  it('answers 200 available:false when the AI fails', async () => {
    const res = await request(failingApp)
      .post('/api/spaces/mira/suggest-communities')
      .set('Cookie', fan.cookie)
      .send({ intro: 'solo traveler who loves street food' })
      .expect(200);
    expect(res.body).toEqual({ available: false, suggestions: [] });
  });

  it('validates the intro and needs a session', async () => {
    await request(app)
      .post('/api/spaces/mira/suggest-communities')
      .send({ intro: 'solo traveler who loves street food' })
      .expect(401);
    const res = await request(app)
      .post('/api/spaces/mira/suggest-communities')
      .set('Cookie', fan.cookie)
      .send({ intro: 'short' })
      .expect(400);
    expect(res.body.error.code).toBe('validation_error');
  });

  it('rate limits after 10 an hour', async () => {
    const used = await repos.aiRuns.countByUserTaskSince(
      other.userId,
      'suggestCommunities',
      new Date(Date.now() - 3_600_000),
    );
    for (let i = used; i < HOURLY_CAPS.suggestCommunities; i += 1) {
      await repos.aiRuns.insert({
        spaceId: mira.space.id,
        userId: other.userId,
        task: 'suggestCommunities',
        model: 'fake',
        status: 'ok',
      });
    }
    const res = await request(app)
      .post('/api/spaces/mira/suggest-communities')
      .set('Cookie', other.cookie)
      .send({ intro: 'solo traveler who loves street food' })
      .expect(429);
    expect(res.body.error.code).toBe('rate_limited');
  });
});

describe('POST /api/spaces/:handle/join', () => {
  it('creates the membership and keeps member counts in sync', async () => {
    const res = await request(app)
      .post('/api/spaces/mira/join')
      .set('Cookie', fan.cookie)
      .send({
        intro: 'solo traveler who loves street food',
        communityIds: [builders.id, fitness.id],
      })
      .expect(200);
    expect(res.body).toMatchObject({ alreadyMember: false, firstCommunitySlug: 'budget-travel' });
    expect(res.body.membership).toMatchObject({
      role: 'member',
      name: 'Arjun Mehta',
      intro: 'solo traveler who loves street food',
    });
    expect(res.body.membership.communityIds.sort()).toEqual([builders.id, fitness.id].sort());
    expect(res.body.membership).not.toHaveProperty('email');
    const counts = await repos.communities.listBySpace(mira.space.id);
    expect(counts.map((c) => c.memberCount)).toEqual([1, 1]);
  });

  it('is idempotent for existing members', async () => {
    const res = await request(app)
      .post('/api/spaces/mira/join')
      .set('Cookie', fan.cookie)
      .send({ communityIds: [builders.id] })
      .expect(200);
    expect(res.body.alreadyMember).toBe(true);
    const counts = await repos.communities.listBySpace(mira.space.id);
    expect(counts.map((c) => c.memberCount)).toEqual([1, 1]);
  });

  it('rejects unknown communities and an empty selection', async () => {
    const res = await request(app)
      .post('/api/spaces/mira/join')
      .set('Cookie', fan.cookie)
      .send({ communityIds: ['00000000-0000-4000-8000-000000000000'] })
      .expect(400);
    expect(res.body.error.code).toBe('validation_error');
    await request(app)
      .post('/api/spaces/mira/join')
      .set('Cookie', fan.cookie)
      .send({ communityIds: [] })
      .expect(400);
  });

  it('refuses removed members', async () => {
    const removedUser = await signInWithOtp(app, 'removed@spaces.test', 'Removed');
    const { membership } = await factories.member(mira.space.id, {
      user: { id: removedUser.userId, email: removedUser.email, name: 'Removed' },
      communityIds: [builders.id],
    });
    await repos.memberships.remove(mira.space.id, membership.id);
    await request(app)
      .post('/api/spaces/mira/join')
      .set('Cookie', removedUser.cookie)
      .send({ communityIds: [builders.id] })
      .expect(403);
    await request(app).get('/api/spaces/mira/me').set('Cookie', removedUser.cookie).expect(403);
  });
});

describe('GET and PATCH /api/spaces/:handle/me', () => {
  it('returns my space with caps', async () => {
    const res = await request(app).get('/api/spaces/mira/me').set('Cookie', fan.cookie).expect(200);
    expect(res.body.space).toEqual({
      handle: 'mira',
      displayName: mira.space.displayName,
      avatarUrl: null,
    });
    expect(res.body.caps).toEqual({
      pitchesLeftToday: DAILY_CAPS.pitches,
      postsLeftToday: DAILY_CAPS.posts,
    });
    expect(res.body.communities.map((c: { slug: string }) => c.slug).sort()).toEqual([
      'budget-travel',
      'solo-travelers',
    ]);
  });

  it('updates the profile and replaces communities', async () => {
    const res = await request(app)
      .patch('/api/spaces/mira/me')
      .set('Cookie', fan.cookie)
      .send({
        headline: 'Frontend dev',
        skills: ['React', 'react', 'Figma'],
        links: [{ label: 'GitHub', url: 'https://github.com/arjun' }],
        communityIds: [fitness.id],
      })
      .expect(200);
    expect(res.body).toMatchObject({
      headline: 'Frontend dev',
      skills: ['react', 'figma'],
      communityIds: [fitness.id],
    });
    const counts = await repos.communities.listBySpace(mira.space.id);
    expect(counts.map((c) => c.memberCount)).toEqual([0, 1]);
    await request(app)
      .patch('/api/spaces/mira/me')
      .set('Cookie', fan.cookie)
      .send({ communityIds: [builders.id, fitness.id] })
      .expect(200);
  });

  it('needs a membership', async () => {
    await request(app).get('/api/spaces/mira/me').expect(401);
    await request(app).get('/api/spaces/mira/me').set('Cookie', other.cookie).expect(403);
    await request(app).get('/api/spaces/nobody/me').set('Cookie', fan.cookie).expect(404);
  });
});

describe('posts in a community', () => {
  it('creates an idea in a joined community, analyzed in the background', async () => {
    const res = await request(app)
      .post('/api/spaces/mira/posts')
      .set('Cookie', fan.cookie)
      .send(postBody(builders.id))
      .expect(201);
    expect(res.body).toMatchObject({
      type: 'idea',
      status: 'open',
      isAuthor: true,
      canEdit: true,
      community: { slug: 'budget-travel' },
      author: { name: 'Arjun Mehta' },
    });
    expect(res.body).not.toHaveProperty('ai');
    await container.background.whenIdle();
    const row = await repos.posts.findById(res.body.id);
    expect(row?.analysisStatus).toBe('done');
    expect(row?.aiFitScore).not.toBeNull();
  });

  it('adds the author as Lead on a project', async () => {
    const res = await request(app)
      .post('/api/spaces/mira/posts')
      .set('Cookie', fan.cookie)
      .send(
        postBody(builders.id, {
          type: 'project',
          title: 'Creator analytics dashboard',
          rolesNeeded: ['Designer', 'designer', 'Backend dev'],
        }),
      )
      .expect(201);
    expect(res.body.rolesNeeded).toEqual(['Designer', 'Backend dev']);
    expect(res.body.team).toEqual([
      expect.objectContaining({ role: 'Lead', status: 'accepted', isLead: true }),
    ]);
    expect(res.body.teamSize).toBe(1);
  });

  it('refuses communities the member has not joined, and non-members', async () => {
    const designers = await repos.communities.insert({
      spaceId: mira.space.id,
      slug: 'designers',
      name: 'Designers',
      sortOrder: 5,
    });
    await request(app)
      .post('/api/spaces/mira/posts')
      .set('Cookie', fan.cookie)
      .send(postBody(designers.id))
      .expect(403);
    await request(app)
      .post('/api/spaces/mira/posts')
      .set('Cookie', other.cookie)
      .send(postBody(builders.id))
      .expect(403);
    const invalid = await request(app)
      .post('/api/spaces/mira/posts')
      .set('Cookie', fan.cookie)
      .send(postBody(builders.id, { title: 'Hi', rolesNeeded: ['Designer'] }))
      .expect(400);
    expect(invalid.body.error.code).toBe('validation_error');
  });

  it('stops at 20 posts a day', async () => {
    const membership = await repos.memberships.findByUser(mira.space.id, fan.userId);
    const today = await repos.posts.countByAuthorSince(
      mira.space.id,
      membership!.id,
      new Date(new Date().toISOString().slice(0, 10)),
    );
    for (let i = today; i < DAILY_CAPS.posts; i += 1) {
      await factories.post(mira.space.id, builders.id, membership!.id, { title: `Filler ${i}` });
    }
    const res = await request(app)
      .post('/api/spaces/mira/posts')
      .set('Cookie', fan.cookie)
      .send(postBody(builders.id))
      .expect(429);
    expect(res.body.error).toMatchObject({
      code: 'daily_cap_reached',
      details: { limit: DAILY_CAPS.posts, used: DAILY_CAPS.posts },
    });
  });

  it('serves the feed to members and a locked preview to others', async () => {
    const member = await request(app)
      .get('/api/spaces/mira/communities/budget-travel/posts?limit=5')
      .set('Cookie', fan.cookie)
      .expect(200);
    expect(member.body).toMatchObject({ locked: false, viewerJoinedCommunity: true, preview: [] });
    expect(member.body.items).toHaveLength(5);
    expect(member.body.nextCursor).toEqual(expect.any(String));
    expect(member.body.counts.project).toBe(1);
    const page2 = await request(app)
      .get(
        `/api/spaces/mira/communities/budget-travel/posts?limit=5&cursor=${member.body.nextCursor}`,
      )
      .set('Cookie', fan.cookie)
      .expect(200);
    const ids = new Set(
      [...member.body.items, ...page2.body.items].map((p: { id: string }) => p.id),
    );
    expect(ids.size).toBe(10);

    const outsider = await request(app)
      .get('/api/spaces/mira/communities/budget-travel/posts')
      .set('Cookie', other.cookie)
      .expect(200);
    expect(outsider.body).toMatchObject({ locked: true, items: [], nextCursor: null });
    expect(outsider.body.preview).toHaveLength(3);

    const projects = await request(app)
      .get('/api/spaces/mira/communities/budget-travel/posts?type=project')
      .set('Cookie', fan.cookie)
      .expect(200);
    expect(projects.body.items.map((p: { type: string }) => p.type)).toEqual(['project']);

    await request(app).get('/api/spaces/mira/communities/budget-travel/posts').expect(401);
    await request(app)
      .get('/api/spaces/mira/communities/nope/posts')
      .set('Cookie', fan.cookie)
      .expect(404);
    await request(app)
      .get('/api/spaces/mira/communities/budget-travel/posts?cursor=garbage')
      .set('Cookie', fan.cookie)
      .expect(400);
  });
});

describe('POST /api/spaces/:handle/pitches', () => {
  it('creates a pitch-only membership for a first-time sender', async () => {
    const sender = await signInWithOtp(app, 'dee@spaces.test', 'Dee');
    const res = await request(app)
      .post('/api/spaces/mira/pitches')
      .set('Cookie', sender.cookie)
      .send(pitchBody)
      .expect(201);
    expect(res.body).toMatchObject({ status: 'new', canWithdraw: true, creatorReply: null });
    expect(res.body).not.toHaveProperty('ai');
    const me = await request(app)
      .get('/api/spaces/mira/me')
      .set('Cookie', sender.cookie)
      .expect(200);
    expect(me.body.membership.communityIds).toEqual([]);
    expect(me.body.pitches).toHaveLength(1);
    expect(me.body.caps.pitchesLeftToday).toBe(DAILY_CAPS.pitches - 1);
  });

  it('stops at 5 pitches a day with the 03 message', async () => {
    for (let i = 0; i < DAILY_CAPS.pitches; i += 1) {
      await request(app)
        .post('/api/spaces/mira/pitches')
        .set('Cookie', fan.cookie)
        .send(pitchBody)
        .expect(201);
    }
    const res = await request(app)
      .post('/api/spaces/mira/pitches')
      .set('Cookie', fan.cookie)
      .send(pitchBody)
      .expect(429);
    expect(res.body.error.code).toBe('daily_cap_reached');
    expect(res.body.error.message).toBe(
      `You've reached today's limit of 5 pitches to ${mira.space.displayName}. Try again tomorrow.`,
    );
  });

  it('refuses the owner and signed-out senders', async () => {
    await request(app)
      .post('/api/spaces/mira/pitches')
      .set('Cookie', owner.cookie)
      .send(pitchBody)
      .expect(403);
    await request(app).post('/api/spaces/mira/pitches').send(pitchBody).expect(401);
  });
});
