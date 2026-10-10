import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
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
