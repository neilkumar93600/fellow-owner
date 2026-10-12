import { eq } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildContainer } from '../../src/container.js';
import { createApp } from '../../src/create-app.js';
import { db } from '../../src/db/client.js';
import { studioSnoozes } from '../../src/db/schema/snoozes.js';
import { spaces } from '../../src/db/schema/spaces.js';
import { utcDayString } from '../../src/lib/dates.js';
import { type SignedIn, signInWithOtp } from '../helpers/auth.js';
import { createFactories, type TestSpace } from '../helpers/factories.js';
import { closeDb, resetDatabase } from '../helpers/test-db.js';

const container = buildContainer();
const app = createApp(container);
const factories = createFactories(container);

let owner: SignedIn;
let other: SignedIn;
let mira: TestSpace;
let pitchId: string;
let postId: string;
let foreignPitchId: string;
let foreignPostId: string;

const post = (path: string, body: object, who = owner) =>
  request(app).post(`/api/studio${path}`).set('Cookie', who.cookie).send(body);

beforeAll(async () => {
  await resetDatabase();
  owner = await signInWithOtp(app, 'mira@snooze.test', 'Mira');
  other = await signInWithOtp(app, 'other@snooze.test', 'Other');
  mira = await factories.space({
    owner: { id: owner.userId, email: owner.email, name: 'Mira' },
    handle: 'mira',
  });
  const theirs = await factories.space({
    owner: { id: other.userId, email: other.email, name: 'Other' },
    handle: 'other',
  });
  const fan = await factories.member(mira.space.id);
  pitchId = (await factories.pitch(mira.space.id, fan.membership.id)).id;
  postId = (await factories.post(mira.space.id, mira.communities[0]?.id ?? '', fan.membership.id))
    .id;
  const theirFan = await factories.member(theirs.space.id);
  foreignPitchId = (await factories.pitch(theirs.space.id, theirFan.membership.id)).id;
  foreignPostId = (
    await factories.post(theirs.space.id, theirs.communities[0]?.id ?? '', theirFan.membership.id)
  ).id;
});

afterAll(async () => {
  await container.background.whenIdle();
  await closeDb();
});

describe('snoozes', () => {
  it('hides a pitch until it expires, then it is no longer active', async () => {
    await post('/snoozes', { refType: 'pitch', refId: pitchId, days: 2 }).expect(204);
    const now = new Date();
    expect(
      (await container.repos.snoozes.activeIds(mira.space.id, 'pitch', now)).has(pitchId),
    ).toBe(true);
    const later = new Date(now.getTime() + 3 * 86_400_000);
    expect(
      (await container.repos.snoozes.activeIds(mira.space.id, 'pitch', later)).has(pitchId),
    ).toBe(false);
  });

  it('snoozes a post and unsnoozes it', async () => {
    await post('/snoozes', { refType: 'post', refId: postId }).expect(204);
    expect((await container.repos.snoozes.activeIds(mira.space.id, 'post')).has(postId)).toBe(true);
    await request(app)
      .delete(`/api/studio/snoozes/post/${postId}`)
      .set('Cookie', owner.cookie)
      .expect(204);
    expect((await container.repos.snoozes.activeIds(mira.space.id, 'post')).has(postId)).toBe(
      false,
    );
  });

  it("Today's lists leave out snoozed pitches and posts; the full lists keep them", async () => {
    await post('/snoozes', { refType: 'pitch', refId: pitchId }).expect(204);
    await post('/snoozes', { refType: 'post', refId: postId }).expect(204);
    const ids = async (path: string) =>
      (
        await request(app).get(`/api/studio${path}`).set('Cookie', owner.cookie).expect(200)
      ).body.items.map((item: { id: string }) => item.id);

    expect(await ids('/inbox?hideSnoozed=true')).not.toContain(pitchId);
    expect(await ids('/inbox')).toContain(pitchId);
    expect(await ids('/ideas?hideSnoozed=true')).not.toContain(postId);
    expect(await ids('/ideas')).toContain(postId);

    await request(app)
      .delete(`/api/studio/snoozes/post/${postId}`)
      .set('Cookie', owner.cookie)
      .expect(204);
    expect(await ids('/ideas?hideSnoozed=true')).toContain(postId);
  });

  it("another owner's items are a 404 and nothing is stored", async () => {
    await post('/snoozes', { refType: 'pitch', refId: foreignPitchId }).expect(404);
    const rows = await db
      .select()
      .from(studioSnoozes)
      .where(eq(studioSnoozes.refId, foreignPitchId));
    expect(rows).toHaveLength(0);
  });
});

describe('snooze ownership', () => {
  const stored = (refId: string) =>
    db.select().from(studioSnoozes).where(eq(studioSnoozes.refId, refId));

  it("another owner's post is a 404 and nothing is stored", async () => {
    await post('/snoozes', { refType: 'post', refId: foreignPostId }).expect(404);
    expect(await stored(foreignPostId)).toHaveLength(0);
  });

  it('an unknown id is a 404 for both kinds', async () => {
    const unknown = '00000000-0000-4000-8000-000000000000';
    await post('/snoozes', { refType: 'post', refId: unknown }).expect(404);
    await post('/snoozes', { refType: 'pitch', refId: unknown }).expect(404);
    expect(await stored(unknown)).toHaveLength(0);
  });
});

describe("snoozed items leave Today's briefing", () => {
  it('drops snoozed highlights and brings them back on unsnooze', async () => {
    await container.repos.digests.upsert({
      spaceId: mira.space.id,
      communityId: null,
      periodDate: utcDayString(),
      content: {
        headline: 'Two to look at',
        highlights: [
          { refType: 'post', refId: postId, why: 'Strong signal' },
          { refType: 'inbound', refId: pitchId, why: 'Good fit' },
        ],
        watchouts: [],
      },
      model: 'fake',
    });
    const refIds = async () =>
      (
        await request(app).get('/api/studio/briefing').set('Cookie', owner.cookie).expect(200)
      ).body.highlights.map((h: { refId: string }) => h.refId);

    // Earlier tests left both snoozed or not; start from a known state.
    await request(app)
      .delete(`/api/studio/snoozes/post/${postId}`)
      .set('Cookie', owner.cookie)
      .expect(204);
    await request(app)
      .delete(`/api/studio/snoozes/pitch/${pitchId}`)
      .set('Cookie', owner.cookie)
      .expect(204);
    expect(await refIds()).toEqual([postId, pitchId]);

    await post('/snoozes', { refType: 'post', refId: postId }).expect(204);
    expect(await refIds()).toEqual([pitchId]);
    await post('/snoozes', { refType: 'pitch', refId: pitchId }).expect(204);
    expect(await refIds()).toEqual([]);

    await request(app)
      .delete(`/api/studio/snoozes/post/${postId}`)
      .set('Cookie', owner.cookie)
      .expect(204);
    await request(app)
      .delete(`/api/studio/snoozes/pitch/${pitchId}`)
      .set('Cookie', owner.cookie)
      .expect(204);
    expect(await refIds()).toEqual([postId, pitchId]);
  });
});

describe('checklist', () => {
  it('persists bio_link_shared once', async () => {
    await post('/checklist', { step: 'bio_link_shared' }).expect(204);
    const [first] = await db.select().from(spaces).where(eq(spaces.id, mira.space.id));
    expect(first?.bioLinkSharedAt).not.toBeNull();
    await post('/checklist', { step: 'bio_link_shared' }).expect(204);
    const [second] = await db.select().from(spaces).where(eq(spaces.id, mira.space.id));
    expect(second?.bioLinkSharedAt?.getTime()).toBe(first?.bioLinkSharedAt?.getTime());
    const space = await request(app).get('/api/studio/space').set('Cookie', owner.cookie);
    expect(space.body.bioLinkSharedAt).toBeTruthy();
  });
});
