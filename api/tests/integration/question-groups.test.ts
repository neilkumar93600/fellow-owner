import { LIMITS, type QuestionGroup } from '@fellow-owners/shared';
import { and, eq } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createFakeAiServices } from '../../src/ai/fake.js';
import { buildContainer } from '../../src/container.js';
import { createApp } from '../../src/create-app.js';
import { inbound } from '../../src/db/schema/inbound.js';
import { notifications } from '../../src/db/schema/later.js';
import { posts } from '../../src/db/schema/posts.js';
import { questionGroups } from '../../src/db/schema/question-groups.js';
import { createQuestionGrouper } from '../../src/workers/group-questions.js';
import { type SignedIn, signInWithOtp } from '../helpers/auth.js';
import { createFactories, type TestSpace } from '../helpers/factories.js';
import { closeDb, db, resetDatabase } from '../helpers/test-db.js';

const container = buildContainer();
const app = createApp(container);
const factories = createFactories(container);
const grouper = createQuestionGrouper(container);

const failingAi = createFakeAiServices({
  accounting: { aiRuns: container.repos.aiRuns },
  failTasks: { questionGroup: 'provider' },
});
const failingContainer = buildContainer({ ai: failingAi });
const failingApp = createApp(failingContainer);
const failingGrouper = createQuestionGrouper(failingContainer);

let mira: TestSpace;
let owner: SignedIn;
let fan: SignedIn;
let otherOwner: SignedIn;
let fanMembershipId: string;

/** A 1536-dim unit-ish vector along `axis`, nudged towards axis + 1 by `tilt`. */
function vec(axis: number, tilt = 0): number[] {
  const v = new Array<number>(LIMITS.ai.embeddingDimensions).fill(0);
  v[axis] = 1;
  v[axis + 1] = tilt;
  return v;
}

let senderSeq = 0;

/** A pitch from a new fan (joined to the first community) with a fixed embedding. */
async function pitchAt(
  space: TestSpace,
  vector: number[],
  options: { type?: 'fan_note' | 'idea' | 'brand_deal'; membershipId?: string; body?: string } = {},
) {
  let membershipId = options.membershipId;
  if (!membershipId) {
    senderSeq += 1;
    const community = space.communities[senderSeq % space.communities.length];
    const { membership } = await factories.member(space.space.id, {
      communityIds: community ? [community.id] : [],
    });
    membershipId = membership.id;
  }
  const row = await factories.pitch(space.space.id, membershipId, {
    type: options.type ?? 'fan_note',
    subject: 'What do you pack for a long trip?',
    body:
      options.body ??
      'How do you pack for two weeks with one carry-on bag? I always overpack and pay fees.',
  });
  await db.update(inbound).set({ embedding: vector }).where(eq(inbound.id, row.id));
  return row;
}

const list = (who: SignedIn, target = app) =>
  request(target).get('/api/studio/question-groups').set('Cookie', who.cookie);

async function openGroups(): Promise<QuestionGroup[]> {
  const res = await list(owner).expect(200);
  return (res.body.items as QuestionGroup[]).filter((group) => group.status === 'open');
}

async function replyNotifications(userId: string) {
  return db
    .select()
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.kind, 'reply_received')));
}

beforeAll(async () => {
  await resetDatabase();
  owner = await signInWithOtp(app, 'mira@groups.test', 'Mira Lane');
  mira = await factories.space({
    handle: 'mira',
    displayName: 'Mira Lane',
    owner: { id: owner.userId, email: owner.email, name: 'Mira Lane' },
  });
  fan = await signInWithOtp(app, 'priya@groups.test', 'Priya Shah');
  const firstCommunity = mira.communities[0];
  if (!firstCommunity) throw new Error('factory space has no community');
  const { membership } = await factories.member(mira.space.id, {
    user: { id: fan.userId, email: fan.email, name: 'Priya Shah' },
    communityIds: [firstCommunity.id],
  });
  fanMembershipId = membership.id;
  otherOwner = await signInWithOtp(app, 'jon@groups.test', 'Jon Other');
  await factories.space({
    handle: 'jon',
    displayName: 'Jon Other',
    owner: { id: otherOwner.userId, email: otherOwner.email, name: 'Jon Other' },
  });
});

afterAll(async () => {
  await container.background.whenIdle();
  await failingContainer.background.whenIdle();
  await closeDb();
});

describe('Answer Once grouping', () => {
  let group: QuestionGroup;
  let fanPitchId: string;

  it('keeps a group hidden until it has 3 askers', async () => {
    fanPitchId = (await pitchAt(mira, vec(0), { membershipId: fanMembershipId })).id;
    await pitchAt(mira, vec(0, 0.1));
    // Near, but brand deals are never grouped.
    await pitchAt(mira, vec(0, 0.05), { type: 'brand_deal' });
    // Far away: stays alone.
    await pitchAt(mira, vec(10));
    expect(await grouper.groupSpace(mira.space.id)).toEqual({ created: 0, joined: 0 });
    expect(await openGroups()).toEqual([]);

    await pitchAt(mira, vec(0, 0.2));
    expect(await grouper.groupSpace(mira.space.id)).toEqual({ created: 1, joined: 0 });
    const groups = await openGroups();
    expect(groups).toHaveLength(1);
    group = groups[0] as QuestionGroup;
    expect(group.askedCount).toBe(3);
    expect(group.askers).toHaveLength(3);
    expect(group.draft).toEqual(expect.any(String));
    expect(group.question.length).toBeGreaterThan(0);
    expect(group.redraftsLeft).toBe(LIMITS.answerOnce.redraftsPerDay);
    expect(group.askers[0]?.quote).toBe('How do you pack for two weeks with one carry-on bag?');
    expect(group.communities.length).toBeGreaterThan(0);
  });

  it('does not duplicate on a second run, and new near pitches join', async () => {
    expect(await grouper.groupSpace(mira.space.id)).toEqual({ created: 0, joined: 0 });
    await pitchAt(mira, vec(0, 0.15));
    expect(await grouper.groupSpace(mira.space.id)).toEqual({ created: 0, joined: 1 });
    const groups = await openGroups();
    expect(groups).toHaveLength(1);
    expect(groups[0]?.askedCount).toBe(4);
  });

  it('removes an asker for good', async () => {
    const removed = group.askers.find((asker) => asker.pitchId !== fanPitchId);
    if (!removed) throw new Error('no asker to remove');
    const res = await request(app)
      .delete(`/api/studio/question-groups/${group.id}/askers/${removed.pitchId}`)
      .set('Cookie', owner.cookie)
      .expect(200);
    expect(res.body.askedCount).toBe(3);
    expect(res.body.askers.map((asker: { pitchId: string }) => asker.pitchId)).not.toContain(
      removed.pitchId,
    );
    expect(await grouper.groupSpace(mira.space.id)).toEqual({ created: 0, joined: 0 });
    expect((await openGroups())[0]?.askedCount).toBe(3);

    // Not in the group (any more): 404.
    await request(app)
      .delete(`/api/studio/question-groups/${group.id}/askers/${removed.pitchId}`)
      .set('Cookie', owner.cookie)
      .expect(404);
  });

  it('redrafts up to the daily cap, then 429', async () => {
    let previous = (await openGroups())[0]?.draft;
    for (let left = LIMITS.answerOnce.redraftsPerDay - 1; left >= 0; left -= 1) {
      const res = await request(app)
        .post(`/api/studio/question-groups/${group.id}/redraft`)
        .set('Cookie', owner.cookie)
        .expect(200);
      expect(res.body.redraftsLeft).toBe(left);
      expect(res.body.draft).not.toBe(previous);
      previous = res.body.draft;
    }
    const res = await request(app)
      .post(`/api/studio/question-groups/${group.id}/redraft`)
      .set('Cookie', owner.cookie)
      .expect(429);
    expect(res.body.error.code).toBe('daily_cap_reached');
  });

  it('answers every asker once and pins the answer', async () => {
    const community = mira.communities[0];
    if (!community) throw new Error('no community');
    const answer = 'One bag, packing cubes, and I wear the heavy shoes on the plane. Video soon!';
    const res = await request(app)
      .post(`/api/studio/question-groups/${group.id}/answer`)
      .set('Cookie', owner.cookie)
      .send({ answer, replyAll: true, pinCommunityIds: [community.id] })
      .expect(200);
    expect(res.body).toMatchObject({
      status: 'answered',
      answer,
      pinnedIn: [community.name],
      postId: expect.any(String),
    });

    const members = await db.select().from(inbound).where(eq(inbound.questionGroupId, group.id));
    expect(members).toHaveLength(3);
    for (const pitch of members) {
      expect(pitch.status).toBe('replied');
      expect(pitch.creatorReply).toBe(answer);
    }
    const sent = await replyNotifications(fan.userId);
    expect(sent).toHaveLength(1);
    expect(sent[0]?.payload).toMatchObject({ inboundId: fanPitchId, questionGroupId: group.id });

    const pinned = await db.select().from(posts).where(eq(posts.questionGroupId, group.id));
    expect(pinned).toHaveLength(1);
    expect(pinned[0]?.id).toBe(res.body.postId);

    // The feed card says it is pinned and which group it answers.
    const feed = await request(app)
      .get(`/api/spaces/mira/communities/${community.slug}/posts`)
      .set('Cookie', fan.cookie)
      .expect(200);
    const card = feed.body.items.find((item: { id: string }) => item.id === res.body.postId);
    expect(card).toMatchObject({ pinned: true, answerGroup: { id: group.id, askedCount: 3 } });

    // Answered groups stay listed, below the open ones.
    const listed = await list(owner).expect(200);
    expect(listed.body.items.map((item: QuestionGroup) => item.status)).toEqual(['answered']);
  });

  it('409 when answering twice, and nobody is replied to again', async () => {
    const res = await request(app)
      .post(`/api/studio/question-groups/${group.id}/answer`)
      .set('Cookie', owner.cookie)
      .send({ answer: 'Second try at this answer.', replyAll: true })
      .expect(409);
    expect(res.body.error.code).toBe('conflict');
    expect(await replyNotifications(fan.userId)).toHaveLength(1);
    const pinned = await db.select().from(posts).where(eq(posts.questionGroupId, group.id));
    expect(pinned).toHaveLength(1);
  });

  it('dismisses a group: hidden from the list', async () => {
    await pitchAt(mira, vec(20));
    await pitchAt(mira, vec(20, 0.1));
    await pitchAt(mira, vec(20, 0.2));
    expect(await grouper.groupSpace(mira.space.id)).toEqual({ created: 1, joined: 0 });
    const [second] = await openGroups();
    if (!second) throw new Error('no second group');
    const res = await request(app)
      .post(`/api/studio/question-groups/${second.id}/dismiss`)
      .set('Cookie', owner.cookie)
      .expect(200);
    expect(res.body.status).toBe('dismissed');
    expect(await openGroups()).toEqual([]);
    await request(app)
      .post(`/api/studio/question-groups/${second.id}/dismiss`)
      .set('Cookie', owner.cookie)
      .expect(409);
  });
});

describe('Answer Once without AI', () => {
  it('creates the group with no draft, the list stays 200, and a later run names it', async () => {
    await pitchAt(mira, vec(40));
    await pitchAt(mira, vec(40, 0.1));
    await pitchAt(mira, vec(40, 0.2));
    expect(await failingGrouper.groupSpace(mira.space.id)).toEqual({ created: 1, joined: 0 });
    const res = await list(owner, failingApp).expect(200);
    const pending = (res.body.items as QuestionGroup[]).find(
      (group) => group.status === 'open' && group.draft === null,
    );
    if (!pending) throw new Error('no pending group');
    expect(pending.question.length).toBeGreaterThan(0);

    const redraft = await request(failingApp)
      .post(`/api/studio/question-groups/${pending.id}/redraft`)
      .set('Cookie', owner.cookie)
      .expect(503);
    expect(redraft.body.error.code).toBe('ai_unavailable');
    // The failed try is given back.
    const after = await list(owner).expect(200);
    expect(
      (after.body.items as QuestionGroup[]).find((group) => group.id === pending.id)?.redraftsLeft,
    ).toBe(LIMITS.answerOnce.redraftsPerDay);

    expect(await grouper.groupDueSpaces(new Date())).toBeGreaterThanOrEqual(1);
    const [row] = await db.select().from(questionGroups).where(eq(questionGroups.id, pending.id));
    expect(row?.draft).toEqual(expect.any(String));
  });
});

describe('Answer Once data integrity', () => {
  let groupId: string;

  it('a withdrawn pitch leaves its group (count and askers recomputed)', async () => {
    const fanPitch = await pitchAt(mira, vec(60), { membershipId: fanMembershipId });
    await pitchAt(mira, vec(60, 0.1));
    await pitchAt(mira, vec(60, 0.2));
    await pitchAt(mira, vec(60, 0.15));
    expect(await grouper.groupSpace(mira.space.id)).toEqual({ created: 1, joined: 0 });
    const [row] = await db.select().from(inbound).where(eq(inbound.id, fanPitch.id));
    groupId = row?.questionGroupId as string;
    expect(groupId).toEqual(expect.any(String));

    await request(app)
      .patch(`/api/pitches/${fanPitch.id}`)
      .set('Cookie', fan.cookie)
      .send({ status: 'withdrawn' })
      .expect(200);
    const [after] = await db.select().from(inbound).where(eq(inbound.id, fanPitch.id));
    expect(after).toMatchObject({ status: 'withdrawn', questionGroupId: null });
    const group = (await openGroups()).find((item) => item.id === groupId);
    expect(group?.askedCount).toBe(3);
    expect(group?.askers.map((asker) => asker.pitchId)).not.toContain(fanPitch.id);
  });

  it('a failing notification after the answer commits still returns the answered group', async () => {
    const spy = vi
      .spyOn(container.services.notifications, 'notify')
      .mockRejectedValue(new Error('notifications down'));
    try {
      const res = await request(app)
        .post(`/api/studio/question-groups/${groupId}/answer`)
        .set('Cookie', owner.cookie)
        .send({ answer: 'Packing cubes, one bag, done.', replyAll: true })
        .expect(200);
      expect(res.body).toMatchObject({ id: groupId, status: 'answered' });
      expect(spy).toHaveBeenCalledTimes(3);
    } finally {
      spy.mockRestore();
    }
    const members = await db.select().from(inbound).where(eq(inbound.questionGroupId, groupId));
    expect(members.map((pitch) => pitch.status)).toEqual(['replied', 'replied', 'replied']);
  });

  it('the grouping job never joins a group answered after it read the open groups', async () => {
    const late = await pitchAt(mira, vec(60, 0.05));
    // The job read the group as open just before the answer committed.
    const stale = vi
      .spyOn(container.repos.questionGroups, 'openCentroids')
      .mockResolvedValueOnce([{ id: groupId, centroid: vec(60), size: 3 }]);
    try {
      expect(await grouper.groupSpace(mira.space.id)).toEqual({ created: 0, joined: 0 });
    } finally {
      stale.mockRestore();
    }
    const [row] = await db.select().from(inbound).where(eq(inbound.id, late.id));
    expect(row?.questionGroupId).toBeNull();
    const [group] = await db.select().from(questionGroups).where(eq(questionGroups.id, groupId));
    expect(group?.askedCount).toBe(3);
  });
});

describe('access', () => {
  it('404 for another owner and for a fan on every route', async () => {
    const [row] = await db
      .select()
      .from(questionGroups)
      .where(eq(questionGroups.spaceId, mira.space.id))
      .limit(1);
    const [pitch] = await db
      .select()
      .from(inbound)
      .where(eq(inbound.spaceId, mira.space.id))
      .limit(1);
    if (!row || !pitch) throw new Error('fixtures missing');
    const base = `/api/studio/question-groups/${row.id}`;

    const other = await list(otherOwner).expect(200);
    expect(other.body.items).toEqual([]);
    for (const who of [otherOwner]) {
      await request(app)
        .post(`${base}/answer`)
        .set('Cookie', who.cookie)
        .send({ answer: 'Not my group to answer.', replyAll: true })
        .expect(404);
      await request(app).post(`${base}/redraft`).set('Cookie', who.cookie).expect(404);
      await request(app).post(`${base}/dismiss`).set('Cookie', who.cookie).expect(404);
      await request(app).delete(`${base}/askers/${pitch.id}`).set('Cookie', who.cookie).expect(404);
    }
    // A fan has no studio space at all.
    await list(fan).expect(404);
    await request(app).post(`${base}/dismiss`).set('Cookie', fan.cookie).expect(404);
  });
});
