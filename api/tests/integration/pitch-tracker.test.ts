import { eq } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildContainer } from '../../src/container.js';
import { createApp } from '../../src/create-app.js';
import { db } from '../../src/db/client.js';
import { inbound } from '../../src/db/schema/inbound.js';
import { posts } from '../../src/db/schema/posts.js';
import { questionGroups } from '../../src/db/schema/question-groups.js';
import { type SignedIn, signInWithOtp } from '../helpers/auth.js';
import { createFactories, type TestSpace } from '../helpers/factories.js';
import { closeDb, resetDatabase } from '../helpers/test-db.js';

const container = buildContainer();
const app = createApp(container);
const factories = createFactories(container);

let owner: SignedIn;
let fan: SignedIn;
let mira: TestSpace;
let membershipId: string;

const asOwner = (path: string) =>
  request(app).get(`/api/studio${path}`).set('Cookie', owner.cookie);
const myPitches = async () => {
  const res = await request(app).get('/api/spaces/mira/me').set('Cookie', fan.cookie).expect(200);
  return res.body as {
    space: { showReadReceipts: boolean };
    pitches: Array<{
      id: string;
      readAt: string | null;
      shortlistedAt: string | null;
      answeredGroup: { count: number; postHref: string } | null;
    }>;
  };
};
const rowOf = async (id: string) => {
  const [row] = await db.select().from(inbound).where(eq(inbound.id, id));
  return row;
};

beforeAll(async () => {
  await resetDatabase();
  owner = await signInWithOtp(app, 'mira@tracker.test', 'Mira');
  fan = await signInWithOtp(app, 'fan@tracker.test', 'Fan');
  mira = await factories.space({
    owner: { id: owner.userId, email: owner.email, name: 'Mira' },
    handle: 'mira',
  });
  const member = await factories.member(mira.space.id, {
    user: { id: fan.userId, email: fan.email, name: 'Fan' },
  });
  membershipId = member.membership.id;
});

afterAll(async () => {
  await container.background.whenIdle();
  await closeDb();
});

describe('read stamp', () => {
  it('is set by the first owner GET only, and never overwritten', async () => {
    const pitch = await factories.pitch(mira.space.id, membershipId);
    expect((await rowOf(pitch.id))?.readAt).toBeNull();

    // Someone else's GET and the owner's PATCH do not stamp.
    await request(app).get(`/api/studio/inbox/${pitch.id}`).set('Cookie', fan.cookie);
    await request(app)
      .patch(`/api/studio/inbox/${pitch.id}`)
      .set('Cookie', owner.cookie)
      .send({ action: 'set_status', status: 'archived' })
      .expect(200);
    expect((await rowOf(pitch.id))?.readAt).toBeNull();

    await asOwner(`/inbox/${pitch.id}`).expect(200);
    const first = (await rowOf(pitch.id))?.readAt;
    expect(first).toBeInstanceOf(Date);
    await asOwner(`/inbox/${pitch.id}`).expect(200);
    expect((await rowOf(pitch.id))?.readAt?.getTime()).toBe(first?.getTime());
  });
});

describe('fan view', () => {
  it('shows readAt only while the space has read receipts on (default on)', async () => {
    const pitch = await factories.pitch(mira.space.id, membershipId);
    await asOwner(`/inbox/${pitch.id}`).expect(200);

    await request(app)
      .put('/api/studio/settings')
      .set('Cookie', owner.cookie)
      .send({ showReadReceipts: false })
      .expect(200);
    const off = await myPitches();
    expect(off.space.showReadReceipts).toBe(false);
    expect(off.pitches.find((p) => p.id === pitch.id)?.readAt).toBeNull();

    await request(app)
      .put('/api/studio/settings')
      .set('Cookie', owner.cookie)
      .send({ showReadReceipts: true })
      .expect(200);
    const on = await myPitches();
    expect(on.space.showReadReceipts).toBe(true);
    expect(on.pitches.find((p) => p.id === pitch.id)?.readAt).toEqual(expect.any(String));
  });

  it('round-trips the setting', async () => {
    const res = await request(app)
      .put('/api/studio/settings')
      .set('Cookie', owner.cookie)
      .send({ showReadReceipts: false })
      .expect(200);
    expect(res.body.showReadReceipts).toBe(false);
    const got = await asOwner('/space').expect(200);
    expect(got.body.showReadReceipts).toBe(false);
  });
});

describe('shortlist stamp', () => {
  it('is set once, on the first shortlist', async () => {
    const pitch = await factories.pitch(mira.space.id, membershipId);
    const set = (status: string) =>
      request(app)
        .patch(`/api/studio/inbox/${pitch.id}`)
        .set('Cookie', owner.cookie)
        .send({ action: 'set_status', status })
        .expect(200);
    await set('shortlisted');
    const first = (await rowOf(pitch.id))?.shortlistedAt;
    expect(first).toBeInstanceOf(Date);
    await set('new');
    await set('shortlisted');
    expect((await rowOf(pitch.id))?.shortlistedAt?.getTime()).toBe(first?.getTime());
  });
});

describe('answeredGroup', () => {
  it('is filled for an answered group and null for an open one', async () => {
    const community = mira.communities[0];
    if (!community) throw new Error('no community');
    const pitch = await factories.pitch(mira.space.id, membershipId);
    const other = await factories.pitch(mira.space.id, membershipId);
    const post = await factories.post(mira.space.id, community.id, null, { title: 'Answer' });
    const now = new Date();
    const [group] = await db
      .insert(questionGroups)
      .values({
        spaceId: mira.space.id,
        question: 'How do you edit?',
        status: 'answered',
        answer: 'Like this.',
        askedCount: 3,
        firstAskedAt: now,
        lastAskedAt: now,
        answeredAt: now,
        postId: post.id,
      })
      .returning();
    if (!group) throw new Error('no group');
    await db.update(posts).set({ questionGroupId: group.id }).where(eq(posts.id, post.id));
    await db.update(inbound).set({ questionGroupId: group.id }).where(eq(inbound.id, pitch.id));

    const view = await myPitches();
    expect(view.pitches.find((p) => p.id === pitch.id)?.answeredGroup).toEqual({
      count: 3,
      postHref: `/mira/p/${post.id}`,
    });
    expect(view.pitches.find((p) => p.id === other.id)?.answeredGroup).toBeNull();
  });
});
