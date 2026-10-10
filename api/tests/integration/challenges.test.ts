import { eq } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { buildContainer } from '../../src/container.js';
import { createApp } from '../../src/create-app.js';
import type { CommunityRow } from '../../src/db/schema/communities.js';
import { communities } from '../../src/db/schema/communities.js';
import { asks } from '../../src/db/schema/later.js';
import { type PostRow, posts } from '../../src/db/schema/posts.js';
import { type SignedIn, signInWithOtp } from '../helpers/auth.js';
import { createFactories, type TestSpace } from '../helpers/factories.js';
import { closeDb, resetDatabase } from '../helpers/test-db.js';

const container = buildContainer();
const app = createApp(container);
const factories = createFactories(container);
let mira: TestSpace;
let owner: SignedIn;
let fan: SignedIn;
let outsiderMember: SignedIn;
let foodFinds: CommunityRow;
let other: CommunityRow;
let unrelatedPost: PostRow;
let challengeId: string;
let fanMembershipId: string;
let pastDueId: string;
const PRIVATE_REASON = 'Matches "small family-run food spots", which you love.';
const entryIds: Record<string, string> = {};

const kinds = async (who: SignedIn) => {
  const res = await request(app).get('/api/notifications').set('Cookie', who.cookie).expect(200);
  return (res.body.items as Array<{ kind: string }>).map((n) => n.kind);
};

beforeAll(async () => {
  await resetDatabase();
  owner = await signInWithOtp(app, 'mira@challenges.test', 'Mira Lane');
  mira = await factories.space({
    handle: 'mira',
    owner: { id: owner.userId, email: owner.email, name: 'Mira Lane' },
  });
  [foodFinds, other] = mira.communities as [CommunityRow, CommunityRow];
  fan = await signInWithOtp(app, 'priya@challenges.test', 'Priya Shah');
  fanMembershipId = (
    await factories.member(mira.space.id, {
      user: { id: fan.userId, email: fan.email, name: 'Priya Shah' },
      communityIds: [foodFinds.id],
    })
  ).membership.id;
  outsiderMember = await signInWithOtp(app, 'leo@challenges.test', 'Leo');
  await factories.member(mira.space.id, {
    user: { id: outsiderMember.userId, email: outsiderMember.email, name: 'Leo' },
    communityIds: [other.id],
  });
  unrelatedPost = await factories.post(mira.space.id, foodFinds.id, fanMembershipId, {
    title: 'Not an entry',
  });
});
afterAll(async () => {
  await container.background.whenIdle();
  await closeDb();
});

describe('challenges', () => {
  it('owner creates a challenge; members of that community are notified ask_posted', async () => {
    const due = new Date(Date.now() + 5 * 864e5).toISOString();
    const res = await request(app)
      .post('/api/studio/challenges')
      .set('Cookie', owner.cookie)
      .send({
        title: 'Best $10 meal in your city',
        body: 'Photo + where',
        communityId: foodFinds.id,
        dueAt: due,
      })
      .expect(201);
    expect(res.body).toMatchObject({
      title: 'Best $10 meal in your city',
      status: 'open',
      entryCount: 0,
      shortlist: null,
      communityName: foodFinds.name,
    });
    challengeId = res.body.id;
    await container.background.whenIdle();
    expect(await kinds(fan)).toContain('ask_posted');
    // Leo is only in the other community, and the owner never notifies herself.
    expect(await kinds(outsiderMember)).not.toContain('ask_posted');
    expect(await kinds(owner)).not.toContain('ask_posted');
  });

  it('rejects a past due date with 422', async () => {
    await request(app)
      .post('/api/studio/challenges')
      .set('Cookie', owner.cookie)
      .send({
        title: 'Too late',
        communityId: null,
        dueAt: new Date(Date.now() - 1000).toISOString(),
      })
      .expect(422);
  });

  it('a fan cannot use the studio routes', async () => {
    await request(app).get('/api/studio/challenges').set('Cookie', fan.cookie).expect(404);
    await request(app)
      .post(`/api/studio/challenges/${challengeId}/close`)
      .set('Cookie', fan.cookie)
      .expect(404);
  });

  it('a member submits an entry; it is a post linked to the ask', async () => {
    const res = await request(app)
      .post(`/api/spaces/mira/challenges/${challengeId}/entries`)
      .set('Cookie', fan.cookie)
      .send({ title: 'Tacos al pastor, Austin', body: '$8.50 at a truck on East 6th' })
      .expect(201);
    expect(res.body.challenge).toMatchObject({ id: challengeId, status: 'open' });
    expect(res.body).toMatchObject({ type: 'idea', community: { id: foodFinds.id } });
    const post = await container.repos.posts.findById(res.body.id);
    expect(post?.askId).toBe(challengeId);
  });

  it('a non-member of the challenge community gets 403', async () => {
    await request(app)
      .post(`/api/spaces/mira/challenges/${challengeId}/entries`)
      .set('Cookie', outsiderMember.cookie)
      .send({ title: 'Not in Food Finds', body: 'A long enough entry body for the check.' })
      .expect(403);
  });

  it('the studio detail lists the entries', async () => {
    const res = await request(app)
      .get(`/api/studio/challenges/${challengeId}`)
      .set('Cookie', owner.cookie)
      .expect(200);
    expect(res.body.entryCount).toBe(1);
    expect(res.body.entries.map((e: { title: string }) => e.title)).toEqual([
      'Tacos al pastor, Austin',
    ]);
  });

  it('close builds a shortlist of at most 3 with reasons; fans on it are notified', async () => {
    for (const [i, title] of [
      'Pho in Houston',
      'Arepas in Miami',
      'Dumplings in Queens',
      'Banh mi in San Jose',
    ].entries()) {
      const entry = await factories.post(mira.space.id, foodFinds.id, fanMembershipId, {
        title,
        askId: challengeId,
      });
      entryIds[title] = entry.id;
      for (let n = 0; n < i; n++) {
        const voter = await factories.member(mira.space.id, { communityIds: [foodFinds.id] });
        await factories.signal(entry.id, voter.membership.id, 'use');
      }
    }
    await container.background.whenIdle();
    // The creator's private AI reason on one entry: the studio sees it, fans never do.
    await container.db
      .update(posts)
      .set({ analysisStatus: 'done', aiFitScore: 95, aiFitReason: PRIVATE_REASON })
      .where(eq(posts.id, entryIds['Arepas in Miami'] as string));
    const res = await request(app)
      .post(`/api/studio/challenges/${challengeId}/close`)
      .set('Cookie', owner.cookie)
      .expect(200);
    await container.background.whenIdle(); // shortlist notifications go out in the background
    expect(res.body.status).toBe('closed');
    expect(res.body.shortlist.length).toBeLessThanOrEqual(3);
    expect(res.body.shortlist.map((s: { reason: string }) => s.reason)).toContain(PRIVATE_REASON);
    for (const s of res.body.shortlist) expect(s.reason.length).toBeGreaterThan(0);
    const ids = res.body.shortlist.map((s: { postId: string }) => s.postId);
    // Unscored entries rank by signals: the 3-vote entry is in, the 0-vote one is out.
    expect(ids).toContain(entryIds['Banh mi in San Jose']);
    expect(ids).not.toContain(entryIds['Pho in Houston']);
    expect(
      res.body.shortlist.find(
        (s: { postId: string }) => s.postId === entryIds['Banh mi in San Jose'],
      ),
    ).toMatchObject({ authorName: 'Priya Shah', reason: "3 fans said they'd use this" });
    expect(await kinds(fan)).toContain('challenge_shortlisted');
  });

  it('closing again is a no-op and sends nothing new', async () => {
    const before = (await kinds(fan)).filter((k) => k === 'challenge_shortlisted').length;
    const res = await request(app)
      .post(`/api/studio/challenges/${challengeId}/close`)
      .set('Cookie', owner.cookie)
      .expect(200);
    expect(res.body.status).toBe('closed');
    const after = (await kinds(fan)).filter((k) => k === 'challenge_shortlisted').length;
    expect(after).toBe(before);
  });

  it('entries after close are rejected with 409', async () => {
    await request(app)
      .post(`/api/spaces/mira/challenges/${challengeId}/entries`)
      .set('Cookie', fan.cookie)
      .send({ title: 'Late entry', body: 'A long enough entry body for the check.' })
      .expect(409);
  });

  it('entries to an open but past-due challenge are rejected with 409', async () => {
    const created = await request(app)
      .post('/api/studio/challenges')
      .set('Cookie', owner.cookie)
      .send({
        title: 'Sunrise spots',
        communityId: null,
        dueAt: new Date(Date.now() + 864e5).toISOString(),
      })
      .expect(201);
    await container.db
      .update(asks)
      .set({ dueAt: new Date(Date.now() - 60_000) })
      .where(eq(asks.id, created.body.id));
    await request(app)
      .post(`/api/spaces/mira/challenges/${created.body.id}/entries`)
      .set('Cookie', fan.cookie)
      .send({ title: 'Griffith Observatory', body: 'Go at 6am, parking is free before 8.' })
      .expect(409);
    pastDueId = created.body.id;
  });

  it('an open challenge past its due date reads as closed on both lists', async () => {
    const fans = await request(app)
      .get('/api/spaces/mira/challenges')
      .set('Cookie', fan.cookie)
      .expect(200);
    expect(fans.body.items.find((c: { id: string }) => c.id === pastDueId)).toMatchObject({
      status: 'closed',
      shortlist: [],
    });
    const studio = await request(app)
      .get('/api/studio/challenges')
      .set('Cookie', owner.cookie)
      .expect(200);
    expect(studio.body.items.find((c: { id: string }) => c.id === pastDueId).status).toBe('closed');
  });

  it('a challenge in an archived community is closed to entries (409, not 403)', async () => {
    const created = await request(app)
      .post('/api/studio/challenges')
      .set('Cookie', owner.cookie)
      .send({
        title: 'Hidden gems',
        communityId: other.id,
        dueAt: new Date(Date.now() + 864e5).toISOString(),
      })
      .expect(201);
    await container.db
      .update(communities)
      .set({ archivedAt: new Date() })
      .where(eq(communities.id, other.id));
    try {
      const res = await request(app)
        .post(`/api/spaces/mira/challenges/${created.body.id}/entries`)
        .set('Cookie', outsiderMember.cookie)
        .send({ title: 'A quiet beach', body: 'Twenty minutes past the last bus stop.' })
        .expect(409);
      expect(res.body.error.message).toBe('This challenge is closed to new entries');
    } finally {
      await container.db
        .update(communities)
        .set({ archivedAt: null })
        .where(eq(communities.id, other.id));
    }
  });

  it('winner must be an entry of this challenge', async () => {
    await request(app)
      .post(`/api/studio/challenges/${challengeId}/winner`)
      .set('Cookie', owner.cookie)
      .send({ postId: unrelatedPost.id })
      .expect(422);
  });

  it('a hidden entry cannot win (422)', async () => {
    const hidden = entryIds['Pho in Houston'] as string;
    await container.db.update(posts).set({ hiddenAt: new Date() }).where(eq(posts.id, hidden));
    await request(app)
      .post(`/api/studio/challenges/${challengeId}/winner`)
      .set('Cookie', owner.cookie)
      .send({ postId: hidden })
      .expect(422);
  });

  it('owner picks a winner from the entries', async () => {
    const winner = entryIds['Dumplings in Queens'];
    const res = await request(app)
      .post(`/api/studio/challenges/${challengeId}/winner`)
      .set('Cookie', owner.cookie)
      .send({ postId: winner })
      .expect(200);
    expect(res.body.winnerPostId).toBe(winner);
    expect(res.body.shortlist.length).toBeGreaterThan(0);
  });

  it('fans see open + closed challenges; shortlist only after close', async () => {
    const res = await request(app)
      .get('/api/spaces/mira/challenges')
      .set('Cookie', fan.cookie)
      .expect(200);
    expect(res.body.items[0]).toHaveProperty('shortlist');
    const closed = res.body.items.find((c: { id: string }) => c.id === challengeId);
    expect(closed.shortlist.length).toBeGreaterThan(0);
    // Fan-safe reasons only: never the creator's private AI reasoning.
    expect(JSON.stringify(res.body)).not.toContain(PRIVATE_REASON);
    expect(JSON.stringify(res.body)).not.toContain('which you love');
    for (const s of closed.shortlist) {
      expect(s.reason).toMatch(/^(\d+ fans? said they'd use this|Picked by Mira Lane)$/);
    }
    for (const c of res.body.items) if (c.status === 'open') expect(c.shortlist).toBeNull();
  });

  it('a challenge in an archived community is left out of the fan list', async () => {
    const created = await request(app)
      .post('/api/studio/challenges')
      .set('Cookie', owner.cookie)
      .send({
        title: 'Rooftop bars',
        communityId: other.id,
        dueAt: new Date(Date.now() + 864e5).toISOString(),
      })
      .expect(201);
    await container.db
      .update(communities)
      .set({ archivedAt: new Date() })
      .where(eq(communities.id, other.id));
    try {
      const fans = await request(app)
        .get('/api/spaces/mira/challenges')
        .set('Cookie', outsiderMember.cookie)
        .expect(200);
      expect(fans.body.items.map((c: { id: string }) => c.id)).not.toContain(created.body.id);
      const studio = await request(app)
        .get('/api/studio/challenges')
        .set('Cookie', owner.cookie)
        .expect(200);
      expect(studio.body.items.map((c: { id: string }) => c.id)).toContain(created.body.id);
    } finally {
      await container.db
        .update(communities)
        .set({ archivedAt: null })
        .where(eq(communities.id, other.id));
    }
  });

  it('an overdue close that fails does not break the fan list', async () => {
    const created = await request(app)
      .post('/api/studio/challenges')
      .set('Cookie', owner.cookie)
      .send({
        title: 'Night markets',
        communityId: null,
        dueAt: new Date(Date.now() + 864e5).toISOString(),
      })
      .expect(201);
    await container.db
      .update(asks)
      .set({ dueAt: new Date(Date.now() - 60_000) })
      .where(eq(asks.id, created.body.id));
    const spy = vi
      .spyOn(container.repos.asks, 'close')
      .mockRejectedValueOnce(new Error('close failed'));
    try {
      const res = await request(app)
        .get('/api/spaces/mira/challenges')
        .set('Cookie', fan.cookie)
        .expect(200);
      expect(res.body.items.map((c: { id: string }) => c.id)).toContain(created.body.id);
    } finally {
      spy.mockRestore();
    }
  });

  it('fan shortlists drop hidden and deleted entries; a hidden winner reads as none', async () => {
    const fanList = async () =>
      (
        await request(app).get('/api/spaces/mira/challenges').set('Cookie', fan.cookie).expect(200)
      ).body.items.find((c: { id: string }) => c.id === challengeId);
    const before = await fanList();
    const winner = before.winnerPostId as string;
    const listed: string[] = before.shortlist.map((s: { postId: string }) => s.postId);
    const deleted = listed.find((id) => id !== winner) as string;
    expect(winner).toBeTruthy();
    expect(deleted).toBeTruthy();
    await container.db.update(posts).set({ hiddenAt: new Date() }).where(eq(posts.id, winner));
    await container.db.update(posts).set({ deletedAt: new Date() }).where(eq(posts.id, deleted));
    const after = await fanList();
    const ids = after.shortlist.map((s: { postId: string }) => s.postId);
    expect(ids).toEqual(listed.filter((id) => id !== winner && id !== deleted));
    expect(after.winnerPostId).toBeNull();
  });

  it('signed-out callers get 401 on the fan list', async () => {
    await request(app).get('/api/spaces/mira/challenges').expect(401);
  });
});
