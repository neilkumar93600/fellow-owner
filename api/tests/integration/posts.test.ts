import { DAILY_CAPS } from '@fellow-owners/shared';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildContainer } from '../../src/container.js';
import { createApp } from '../../src/create-app.js';
import type { CommunityRow } from '../../src/db/schema/communities.js';
import type { MembershipRow } from '../../src/db/schema/memberships.js';
import type { PostRow } from '../../src/db/schema/posts.js';
import { type SignedIn, signInWithOtp } from '../helpers/auth.js';
import { createFactories, type TestSpace } from '../helpers/factories.js';
import { closeDb, resetDatabase } from '../helpers/test-db.js';

const container = buildContainer();
const app = createApp(container);
const factories = createFactories(container);
const { repos } = container;

interface Member extends SignedIn {
  membership: MembershipRow;
}

let mira: TestSpace;
let builders: CommunityRow;
let author: Member;
let fan: Member;
let third: Member;
let outsider: SignedIn;
let idea: PostRow;
let project: PostRow;

async function member(email: string, name: string): Promise<Member> {
  const signedIn = await signInWithOtp(app, email, name);
  const { membership } = await factories.member(mira.space.id, {
    user: { id: signedIn.userId, email, name },
    communityIds: [builders.id],
  });
  return { ...signedIn, membership };
}

beforeAll(async () => {
  await resetDatabase();
  mira = await factories.space({ handle: 'mira' });
  builders = mira.communities[0] as CommunityRow;
  author = await member('arjun@posts.test', 'Arjun Mehta');
  fan = await member('bea@posts.test', 'Bea');
  third = await member('cal@posts.test', 'Cal');
  outsider = await signInWithOtp(app, 'outsider@posts.test', 'Outsider');
  idea = await factories.post(mira.space.id, builders.id, author.membership.id, {
    title: 'Gym log app for creators',
  });
  project = await factories.post(mira.space.id, builders.id, author.membership.id, {
    type: 'project',
    title: 'Creator analytics dashboard',
    rolesNeeded: ['Designer', 'Backend dev'],
  });
});

afterAll(async () => {
  await container.background.whenIdle();
  await closeDb();
});

describe('GET /api/posts/:id', () => {
  it('returns the member view without AI fields', async () => {
    const res = await request(app)
      .get(`/api/posts/${idea.id}`)
      .set('Cookie', fan.cookie)
      .expect(200);
    expect(res.body).toMatchObject({
      id: idea.id,
      isAuthor: false,
      canEdit: false,
      viewerTeam: null,
      comments: [],
      author: { membershipId: author.membership.id, name: 'Arjun Mehta' },
    });
    expect(res.body).not.toHaveProperty('ai');
    expect(JSON.stringify(res.body)).not.toContain('@posts.test');
  });

  it('guards access', async () => {
    await request(app).get(`/api/posts/${idea.id}`).expect(401);
    await request(app).get(`/api/posts/${idea.id}`).set('Cookie', outsider.cookie).expect(403);
    await request(app)
      .get('/api/posts/00000000-0000-4000-8000-000000000000')
      .set('Cookie', fan.cookie)
      .expect(404);
    const bad = await request(app)
      .get('/api/posts/not-a-uuid')
      .set('Cookie', fan.cookie)
      .expect(400);
    expect(bad.body.error.code).toBe('validation_error');
  });

  it('hides hidden posts from members, the author included', async () => {
    const hidden = await factories.post(mira.space.id, builders.id, author.membership.id);
    await repos.posts.setHidden(mira.space.id, hidden.id, true);
    await request(app).get(`/api/posts/${hidden.id}`).set('Cookie', author.cookie).expect(404);
  });
});

describe('PATCH and DELETE /api/posts/:id', () => {
  it('lets the author edit content, which resets the analysis', async () => {
    await repos.posts.saveAnalysis(idea.id, {
      summary: 's',
      category: 'idea',
      fitScore: 80,
      fitReason: 'r',
      tags: [],
      skills: [],
      isSpam: false,
      scoredTasteVersion: 1,
    });
    const res = await request(app)
      .patch(`/api/posts/${idea.id}`)
      .set('Cookie', author.cookie)
      .send({ title: 'Gym log app for creators, v2' })
      .expect(200);
    expect(res.body.title).toBe('Gym log app for creators, v2');
    const row = await repos.posts.findById(idea.id);
    expect(row?.contentHash).not.toBe(idea.contentHash);
    expect(['pending', 'done']).toContain(row?.analysisStatus);
    await container.background.whenIdle();
    expect((await repos.posts.findById(idea.id))?.analysisStatus).toBe('done');
  });

  it('refuses other members and empty patches', async () => {
    await request(app)
      .patch(`/api/posts/${idea.id}`)
      .set('Cookie', fan.cookie)
      .send({ title: 'Hijacked title' })
      .expect(403);
    await request(app)
      .patch(`/api/posts/${idea.id}`)
      .set('Cookie', author.cookie)
      .send({})
      .expect(400);
    await request(app)
      .patch(`/api/posts/${idea.id}`)
      .set('Cookie', author.cookie)
      .send({ rolesNeeded: ['Designer'] })
      .expect(400);
  });

  it('closes content edits after 24 hours but allows status changes', async () => {
    const old = await factories.post(mira.space.id, builders.id, author.membership.id, {
      title: 'An older idea',
      createdAt: new Date(Date.now() - 25 * 3_600_000),
    });
    const links = [{ label: 'Repo', url: 'https://github.com/arjun/gym-log' }];
    await repos.posts.update(mira.space.id, old.id, { links });
    const closed = await request(app)
      .patch(`/api/posts/${old.id}`)
      .set('Cookie', author.cookie)
      .send({ title: 'A late change' })
      .expect(403);
    expect(closed.body.error.code).toBe('edit_window_closed');
    // The whole form sent back unchanged (links come back from jsonb with another key order).
    const status = await request(app)
      .patch(`/api/posts/${old.id}`)
      .set('Cookie', author.cookie)
      .send({ title: 'An older idea', links, rolesNeeded: [], status: 'building' })
      .expect(200);
    expect(status.body).toMatchObject({ status: 'building', canEdit: false, links });
  });

  it('soft-deletes for the author only', async () => {
    const post = await factories.post(mira.space.id, builders.id, author.membership.id);
    await request(app).delete(`/api/posts/${post.id}`).set('Cookie', fan.cookie).expect(403);
    await request(app).delete(`/api/posts/${post.id}`).set('Cookie', author.cookie).expect(204);
    expect((await repos.posts.findById(post.id))?.deletedAt).not.toBeNull();
    await request(app).get(`/api/posts/${post.id}`).set('Cookie', author.cookie).expect(404);
  });
});

describe('comments', () => {
  it('creates and soft-deletes with comment_count in sync', async () => {
    const created = await request(app)
      .post(`/api/posts/${project.id}/comments`)
      .set('Cookie', fan.cookie)
      .send({ body: 'I would use this every day.' })
      .expect(201);
    expect(created.body).toMatchObject({
      isOwn: true,
      body: 'I would use this every day.',
      author: { membershipId: fan.membership.id, name: 'Bea' },
    });
    expect((await repos.posts.findById(project.id))?.commentCount).toBe(1);

    await request(app)
      .delete(`/api/posts/${project.id}/comments/${created.body.id}`)
      .set('Cookie', author.cookie)
      .expect(403);
    await request(app)
      .delete(`/api/posts/${project.id}/comments/${created.body.id}`)
      .set('Cookie', fan.cookie)
      .expect(204);
    await request(app)
      .delete(`/api/posts/${project.id}/comments/${created.body.id}`)
      .set('Cookie', fan.cookie)
      .expect(404);
    expect((await repos.posts.findById(project.id))?.commentCount).toBe(0);
  });

  it('validates and caps comments', async () => {
    await request(app)
      .post(`/api/posts/${project.id}/comments`)
      .set('Cookie', fan.cookie)
      .send({ body: '   ' })
      .expect(400);
    await request(app)
      .post(`/api/posts/${project.id}/comments`)
      .set('Cookie', outsider.cookie)
      .send({ body: 'hello' })
      .expect(403);
    const since = new Date(new Date().toISOString().slice(0, 10));
    const used = await repos.comments.countByAuthorSince(mira.space.id, third.membership.id, since);
    await repos.comments.insertMany(
      Array.from({ length: DAILY_CAPS.comments - used }, (_, i) => ({
        postId: project.id,
        spaceId: mira.space.id,
        authorMembershipId: third.membership.id,
        body: `filler ${i}`,
      })),
    );
    const res = await request(app)
      .post(`/api/posts/${project.id}/comments`)
      .set('Cookie', third.cookie)
      .send({ body: 'one too many' })
      .expect(429);
    expect(res.body.error.code).toBe('daily_cap_reached');
  });
});

describe('signals', () => {
  it('are idempotent and keep counts in sync', async () => {
    const put = () =>
      request(app).put(`/api/posts/${idea.id}/signals/use`).set('Cookie', fan.cookie).expect(200);
    expect((await put()).body).toEqual({ useCount: 1, buildCount: 0, viewerSignals: ['use'] });
    expect((await put()).body.useCount).toBe(1);
    const build = await request(app)
      .put(`/api/posts/${idea.id}/signals/build`)
      .set('Cookie', fan.cookie)
      .expect(200);
    expect(build.body).toEqual({ useCount: 1, buildCount: 1, viewerSignals: ['build', 'use'] });
    const removed = await request(app)
      .delete(`/api/posts/${idea.id}/signals/build`)
      .set('Cookie', fan.cookie)
      .expect(200);
    expect(removed.body).toEqual({ useCount: 1, buildCount: 0, viewerSignals: ['use'] });
    await request(app)
      .delete(`/api/posts/${idea.id}/signals/build`)
      .set('Cookie', fan.cookie)
      .expect(200);
    const row = await repos.posts.findById(idea.id);
    expect([row?.useCount, row?.buildCount]).toEqual([1, 0]);
  });

  it('are not allowed on your own post', async () => {
    await request(app)
      .put(`/api/posts/${idea.id}/signals/use`)
      .set('Cookie', author.cookie)
      .expect(403);
    await request(app)
      .put(`/api/posts/${idea.id}/signals/love`)
      .set('Cookie', fan.cookie)
      .expect(400);
  });
});

describe('teams', () => {
  it('runs request -> accept, filling the role', async () => {
    const requested = await request(app)
      .post(`/api/posts/${project.id}/team`)
      .set('Cookie', fan.cookie)
      .send({ role: 'designer' })
      .expect(200);
    expect(requested.body.viewerTeam).toEqual({ role: 'Designer', status: 'requested' });
    expect(requested.body.team).toHaveLength(1);
    expect(requested.body.roles[0]).toMatchObject({
      role: 'Designer',
      filled: false,
      requestCount: 1,
    });

    const authorView = await request(app)
      .get(`/api/posts/${project.id}`)
      .set('Cookie', author.cookie)
      .expect(200);
    expect(authorView.body.team.map((t: { status: string }) => t.status)).toEqual([
      'accepted',
      'requested',
    ]);

    await request(app)
      .patch(`/api/posts/${project.id}/team/${fan.membership.id}`)
      .set('Cookie', fan.cookie)
      .send({ status: 'accepted' })
      .expect(403);
    const accepted = await request(app)
      .patch(`/api/posts/${project.id}/team/${fan.membership.id}`)
      .set('Cookie', author.cookie)
      .send({ status: 'accepted' })
      .expect(200);
    expect(accepted.body.roles[0]).toMatchObject({
      filled: true,
      filledBy: { membershipId: fan.membership.id },
    });
    expect(accepted.body.openRoles).toEqual(['Backend dev']);
    expect(accepted.body.teamSize).toBe(2);
  });

  it('enforces open roles, one request per member and a fixed Lead', async () => {
    await request(app)
      .post(`/api/posts/${project.id}/team`)
      .set('Cookie', third.cookie)
      .send({ role: 'Designer' })
      .expect(409);
    await request(app)
      .post(`/api/posts/${project.id}/team`)
      .set('Cookie', third.cookie)
      .send({ role: 'Pilot' })
      .expect(400);
    await request(app)
      .post(`/api/posts/${project.id}/team`)
      .set('Cookie', fan.cookie)
      .send({ role: 'Backend dev' })
      .expect(409);
    await request(app)
      .post(`/api/posts/${idea.id}/team`)
      .set('Cookie', fan.cookie)
      .send({ role: 'Designer' })
      .expect(400);
    await request(app)
      .patch(`/api/posts/${project.id}/team/${author.membership.id}`)
      .set('Cookie', author.cookie)
      .send({ status: 'declined' })
      .expect(400);
    await request(app)
      .patch(`/api/posts/${project.id}/team/${third.membership.id}`)
      .set('Cookie', author.cookie)
      .send({ status: 'accepted' })
      .expect(404);
  });

  it('shows members the accepted team only', async () => {
    await request(app)
      .post(`/api/posts/${project.id}/team`)
      .set('Cookie', third.cookie)
      .send({ role: 'Backend dev' })
      .expect(200);
    const asMember = await request(app)
      .get(`/api/posts/${project.id}`)
      .set('Cookie', fan.cookie)
      .expect(200);
    expect(new Set(asMember.body.team.map((t: { status: string }) => t.status))).toEqual(
      new Set(['accepted']),
    );
    const me = await request(app).get('/api/spaces/mira/me').set('Cookie', fan.cookie).expect(200);
    expect(me.body.teams).toEqual([
      expect.objectContaining({ role: 'Designer', status: 'accepted', isLead: false }),
    ]);
  });
});
