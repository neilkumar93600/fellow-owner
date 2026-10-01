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

let mira: TestSpace;
let sender: SignedIn;
let stranger: SignedIn;

const pitchBody = {
  type: 'collab',
  subject: 'Partnership on a fitness campaign',
  body: 'We would love to partner with you on a fitness campaign for creators next month.',
  links: [{ label: 'Deck', url: 'https://example.com/deck' }],
};

async function sendPitch(): Promise<string> {
  const res = await request(app)
    .post('/api/spaces/mira/pitches')
    .set('Cookie', sender.cookie)
    .send(pitchBody)
    .expect(201);
  return res.body.id;
}

beforeAll(async () => {
  await resetDatabase();
  mira = await factories.space({ handle: 'mira' });
  sender = await signInWithOtp(app, 'dee@pitches.test', 'Dee');
  stranger = await signInWithOtp(app, 'cal@pitches.test', 'Cal');
});

afterAll(async () => {
  await container.background.whenIdle();
  await closeDb();
});

describe('PATCH /api/pitches/:id', () => {
  it('lets the sender withdraw a new pitch', async () => {
    const id = await sendPitch();
    const res = await request(app)
      .patch(`/api/pitches/${id}`)
      .set('Cookie', sender.cookie)
      .send({ status: 'withdrawn' })
      .expect(200);
    expect(res.body).toMatchObject({ id, status: 'withdrawn', canWithdraw: false });
    expect(res.headers['cache-control']).toContain('no-store');
  });

  it('answers 409 once the pitch is no longer new', async () => {
    const id = await sendPitch();
    await repos.pitches.reply(mira.space.id, id, 'Thanks, let us talk.');
    const res = await request(app)
      .patch(`/api/pitches/${id}`)
      .set('Cookie', sender.cookie)
      .send({ status: 'withdrawn' })
      .expect(409);
    expect(res.body.error.code).toBe('conflict');
    const me = await request(app)
      .get('/api/spaces/mira/me')
      .set('Cookie', sender.cookie)
      .expect(200);
    const replied = me.body.pitches.find((p: { id: string }) => p.id === id);
    expect(replied).toMatchObject({ status: 'replied', creatorReply: 'Thanks, let us talk.' });
    expect(replied.repliedAt).toEqual(expect.any(String));
  });

  it('only lets the sender withdraw', async () => {
    const id = await sendPitch();
    await request(app)
      .patch(`/api/pitches/${id}`)
      .set('Cookie', stranger.cookie)
      .send({ status: 'withdrawn' })
      .expect(403);
    await request(app).patch(`/api/pitches/${id}`).send({ status: 'withdrawn' }).expect(401);
  });

  it('validates the body and the id', async () => {
    const id = await sendPitch();
    await request(app)
      .patch(`/api/pitches/${id}`)
      .set('Cookie', sender.cookie)
      .send({ status: 'archived' })
      .expect(400);
    await request(app)
      .patch('/api/pitches/00000000-0000-4000-8000-000000000000')
      .set('Cookie', sender.cookie)
      .send({ status: 'withdrawn' })
      .expect(404);
  });
});
