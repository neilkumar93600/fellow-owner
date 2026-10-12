import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ensureDemoUsers } from '../../src/auth/demo.js';
import { buildContainer } from '../../src/container.js';
import { createApp } from '../../src/create-app.js';
import { type SignedIn, signInAsDemo, signInWithOtp } from '../helpers/auth.js';
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

let demoSpace: TestSpace;
let realSpace: TestSpace;
let real: SignedIn;
let demoFan: SignedIn;

const join = (who: SignedIn, space: TestSpace) =>
  request(app)
    .post(`/api/spaces/${space.space.handle}/join`)
    .set('Cookie', who.cookie)
    .send({ communityIds: [space.communities[0]?.id] });
const pitch = (who: SignedIn, space: TestSpace) =>
  request(app)
    .post(`/api/spaces/${space.space.handle}/pitches`)
    .set('Cookie', who.cookie)
    .send(pitchBody);
const coach = (who: SignedIn, space: TestSpace) =>
  request(app)
    .post(`/api/spaces/${space.space.handle}/coach`)
    .set('Cookie', who.cookie)
    .send(coachBody);

beforeAll(async () => {
  await resetDatabase();
  const demo = await ensureDemoUsers(container.auth, container.env);
  demoSpace = await factories.space({ owner: demo.creator, handle: 'mira', isDemo: true });
  realSpace = await factories.space({ handle: 'realcreator' });
  real = await signInWithOtp(app, 'alice@isolation.test', 'Alice');
  demoFan = await signInAsDemo(container, 'fan');
});
afterAll(async () => {
  await container.background.whenIdle();
  await closeDb();
});

describe('a real account and the demo space', () => {
  it('can not join, pitch or coach-check it', async () => {
    expect((await join(real, demoSpace).expect(403)).body.error.message).toBe(
      'This is a demo space',
    );
    await pitch(real, demoSpace).expect(403);
    await coach(real, demoSpace).expect(403);
    expect(await repos.memberships.findByUser(demoSpace.space.id, real.userId)).toBeNull();
  });

  it('still joins real spaces', async () => {
    await join(real, realSpace).expect(200);
  });
});

describe('the shared demo accounts', () => {
  it('use the demo space', async () => {
    await join(demoFan, demoSpace).expect(200);
    await pitch(demoFan, demoSpace).expect(201);
  });

  it('can not join, pitch or coach-check a real space', async () => {
    const res = await join(demoFan, realSpace).expect(403);
    expect(res.body.error.message).toBe('The demo accounts can only use the demo space');
    await pitch(demoFan, realSpace).expect(403);
    await coach(demoFan, realSpace).expect(403);
    expect(await repos.memberships.findByUser(realSpace.space.id, demoFan.userId)).toBeNull();
  });

  it('can not create a space of their own', async () => {
    await request(app)
      .post('/api/studio/space')
      .set('Cookie', demoFan.cookie)
      .send({ handle: 'squatted', displayName: 'Squatted', communities: [] })
      .expect(403);
    expect(await repos.spaces.findByOwnerUserId(demoFan.userId)).toBeNull();
  });
});
