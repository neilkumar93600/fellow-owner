import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { buildContainer } from '../../src/container.js';
import { createApp } from '../../src/create-app.js';
import { type SignedIn, signInWithOtp } from '../helpers/auth.js';
import { createFactories, type TestSpace } from '../helpers/factories.js';
import { closeDb, resetDatabase } from '../helpers/test-db.js';

const container = buildContainer();
const app = createApp(container);
const factories = createFactories(container);
const { repos } = container;

const pitchBody = {
  type: 'idea',
  subject: 'A packing list video',
  body: 'Could you film a one-bag packing list for two weeks in Japan? I would watch it twice.',
  links: [],
};
const coachBody = { kind: 'pitch', subject: pitchBody.subject, body: pitchBody.body };

let mira: TestSpace;

/** A signed-in fan with a membership in Mira's space, then taken out by `how`. */
async function fanWho(how: 'left' | 'removed', email: string): Promise<SignedIn> {
  const fan = await signInWithOtp(app, email, 'Fan');
  const community = mira.communities[0];
  const { membership } = await factories.member(mira.space.id, {
    user: { id: fan.userId, email, name: 'Fan' },
    communityIds: community ? [community.id] : [],
  });
  await repos.memberships.remove(mira.space.id, membership.id, undefined, {
    left: how === 'left',
  });
  return fan;
}

const pitch = (who: SignedIn) =>
  request(app).post('/api/spaces/mira/pitches').set('Cookie', who.cookie).send(pitchBody);
const coach = (who: SignedIn, body: object = coachBody) =>
  request(app).post('/api/spaces/mira/coach').set('Cookie', who.cookie).send(body);

beforeAll(async () => {
  await resetDatabase();
  mira = await factories.space({ handle: 'mira' });
});
afterAll(async () => {
  await container.background.whenIdle();
  await closeDb();
});

describe('a fan who left the space', () => {
  it('may use the pitch coach, but not the post coach', async () => {
    const fan = await fanWho('left', 'left-coach@left.test');
    await coach(fan).expect(200);
    const res = await coach(fan, { ...coachBody, kind: 'post' }).expect(403);
    expect(res.body.error.message).toBe('Join this space to check a post');
  });

  it('may pitch again, which brings them back like join', async () => {
    const fan = await fanWho('left', 'left-pitch@left.test');
    const res = await pitch(fan).expect(201);
    expect(res.body.status).toBe('new');
    const row = await repos.memberships.findByUser(mira.space.id, fan.userId);
    expect(row).toMatchObject({ removedAt: null, leftAt: null });
  });
});

describe('a fan the owner removed', () => {
  it('gets 403 "You were removed" on pitch and coach', async () => {
    const fan = await fanWho('removed', 'removed@left.test');
    expect((await pitch(fan).expect(403)).body.error.message).toBe(
      'You were removed from this space',
    );
    expect((await coach(fan).expect(403)).body.error.message).toBe(
      'You were removed from this space',
    );
    const row = await repos.memberships.findByUser(mira.space.id, fan.userId);
    expect(row?.removedAt).not.toBeNull();
  });
});

describe('the owner removes a fan who already left', () => {
  it('turns the leave into a removal, so they can not come back', async () => {
    const fan = await fanWho('left', 'left-then-removed@left.test');
    const row = await repos.memberships.findByUser(mira.space.id, fan.userId);
    if (!row) throw new Error('no membership');
    await container.services.memberships.remove(
      { userId: mira.owner.id, space: mira.space, membership: mira.ownerMembership },
      row.id,
    );
    expect((await pitch(fan).expect(403)).body.error.message).toBe(
      'You were removed from this space',
    );
    await request(app)
      .post('/api/spaces/mira/join')
      .set('Cookie', fan.cookie)
      .send({ communityIds: [mira.communities[0]?.id] })
      .expect(403);
    expect(await repos.memberships.findByUser(mira.space.id, fan.userId)).toMatchObject({
      leftAt: null,
    });
  });
});

describe('profile and community edits', () => {
  it('re-check the membership inside the transaction: a removal in between wins', async () => {
    const email = 'stale@left.test';
    const fan = await signInWithOtp(app, email, 'Stale');
    const [first, second] = mira.communities;
    if (!first || !second) throw new Error('two communities expected');
    const { membership } = await factories.member(mira.space.id, {
      user: { id: fan.userId, email, name: 'Stale' },
      communityIds: [first.id],
    });
    // The request resolved the member before the owner's removal committed.
    const stale = { userId: fan.userId, space: mira.space, membership };
    await repos.memberships.remove(mira.space.id, membership.id);
    const before = (await repos.communities.findById(mira.space.id, second.id))?.memberCount;

    await expect(
      container.services.memberships.updateMe(stale, { communityIds: [second.id] }),
    ).rejects.toMatchObject({ status: 403 });
    expect(await repos.memberships.communityIds(membership.id)).toEqual([]);
    expect((await repos.communities.findById(mira.space.id, second.id))?.memberCount).toBe(before);
  });

  it('embed the profile only when headline, intro or skills changed', async () => {
    const email = 'embed@left.test';
    const fan = await signInWithOtp(app, email, 'Embed');
    await factories.member(mira.space.id, {
      user: { id: fan.userId, email, name: 'Embed' },
      communityIds: [mira.communities[0]?.id ?? ''],
    });
    const embed = vi.spyOn(container.ai, 'embedItem');
    const patch = (body: object) =>
      request(app).patch('/api/spaces/mira/me').set('Cookie', fan.cookie).send(body).expect(200);
    try {
      await patch({ headline: 'Trail runner' });
      await patch({ headline: 'Trail runner' });
      await patch({ links: [] });
      await container.background.whenIdle();
      expect(embed).toHaveBeenCalledTimes(1);
      await patch({ skills: ['editing'] });
      await container.background.whenIdle();
      expect(embed).toHaveBeenCalledTimes(2);
    } finally {
      embed.mockRestore();
    }
  });
});
