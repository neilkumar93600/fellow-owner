import { LIMITS } from '@fellow-owners/shared';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createFakeAiServices } from '../../src/ai/fake.js';
import { buildContainer } from '../../src/container.js';
import { createApp } from '../../src/create-app.js';
import { type SignedIn, signInWithOtp } from '../helpers/auth.js';
import { createFactories, type TestSpace } from '../helpers/factories.js';
import { closeDb, resetDatabase } from '../helpers/test-db.js';

const container = buildContainer();
const app = createApp(container);
const factories = createFactories(container);

// Same database, AI that always fails: the coach must answer ai_unavailable, never 500.
const failingApp = createApp(
  buildContainer({
    ai: createFakeAiServices({
      accounting: { aiRuns: container.repos.aiRuns },
      failTasks: { coach: 'provider' },
    }),
  }),
);

const PITCH_BODY =
  'Budget Travel fans keep asking where to eat in Lisbon under $10. I started a shared map where each fan adds one spot with the price. Could you pin it for a month? https://example.com/map';
const POST_BODY =
  'Slow-living goals fade after week one because nobody wants to post a bad week. Slow Living fans could hide week one and unlock it together. I need an illustrator to help. First step: a two-week trial.';

let mira: TestSpace;
let owner: SignedIn;
let member: SignedIn;
let outsider: SignedIn;

const coach = (who: SignedIn | null, body: unknown, handle = 'mira', target = app) => {
  const req = request(target).post(`/api/spaces/${handle}/coach`);
  return (who ? req.set('Cookie', who.cookie) : req).send(body as object);
};

beforeAll(async () => {
  await resetDatabase();
  owner = await signInWithOtp(app, 'mira@coach.test', 'Mira Lane');
  mira = await factories.space({
    handle: 'mira',
    displayName: 'Mira Lane',
    owner: { id: owner.userId, email: owner.email, name: 'Mira Lane' },
  });
  member = await signInWithOtp(app, 'priya@coach.test', 'Priya Shah');
  await factories.member(mira.space.id, {
    user: { id: member.userId, email: member.email, name: 'Priya Shah' },
  });
  outsider = await signInWithOtp(app, 'sam@coach.test', 'Sam Lee');
});

afterAll(async () => {
  await container.background.whenIdle();
  await closeDb();
});

describe('POST /api/spaces/:handle/coach', () => {
  it('401 when signed out', async () => {
    await coach(null, { kind: 'pitch', subject: 'x', body: PITCH_BODY }).expect(401);
  });

  it('400 when the body is under the minimum', async () => {
    const res = await coach(member, { kind: 'pitch', subject: 'x', body: 'too short' }).expect(400);
    expect(res.body.error.code).toBe('validation_error');
  });

  it('404 for an unknown space', async () => {
    await coach(member, { kind: 'pitch', subject: 'x', body: PITCH_BODY }, 'nobody').expect(404);
  });

  it('checks a pitch for a member: four keys, clarity only, one check used', async () => {
    const res = await coach(member, {
      kind: 'pitch',
      subject: 'A shared Lisbon food map',
      body: PITCH_BODY,
    }).expect(200);
    expect(res.body.checks.map((c: { key: string }) => c.key)).toEqual([
      'audience',
      'ask',
      'proof',
      'length',
    ]);
    expect(res.body.checksLeftToday).toBe(LIMITS.coach.perDay - 1);
    expect(JSON.stringify(res.body)).not.toMatch(/score|\/10|likely to be accepted/i);
  });

  it('lets a signed-in non-member check a pitch', async () => {
    const res = await coach(outsider, { kind: 'pitch', body: PITCH_BODY }).expect(200);
    expect(res.body.checks).toHaveLength(4);
  });

  it('checks a post for a member with the post keys', async () => {
    const res = await coach(member, {
      kind: 'post',
      subject: 'A slow-living board',
      body: POST_BODY,
    }).expect(200);
    expect(res.body.checks.map((c: { key: string }) => c.key)).toEqual([
      'problem',
      'audience',
      'help',
      'next',
    ]);
  });

  it('403 when a non-member checks a post', async () => {
    await coach(outsider, { kind: 'post', subject: 'A board', body: POST_BODY }).expect(403);
  });

  it('records the call in ai_runs without charging the space budget (C5)', async () => {
    const used = await container.repos.aiRuns.budgetState(mira.space.id);
    expect(used.used).toBe(0);
  });

  it('429 rate_limited with checksLeftToday 0 after the daily limit', async () => {
    const fresh = await signInWithOtp(app, 'cap@coach.test', 'Cap Fan');
    for (let i = 0; i < LIMITS.coach.perDay; i += 1) {
      const res = await coach(fresh, { kind: 'pitch', body: PITCH_BODY }).expect(200);
      expect(res.body.checksLeftToday).toBe(LIMITS.coach.perDay - i - 1);
    }
    const res = await coach(fresh, { kind: 'pitch', body: PITCH_BODY }).expect(429);
    expect(res.body.error.code).toBe('rate_limited');
    expect(res.body.error.details).toEqual({ checksLeftToday: 0 });
  });

  it('answers ai_unavailable (not 500) when the AI fails', async () => {
    const res = await coach(member, { kind: 'pitch', body: PITCH_BODY }, 'mira', failingApp).expect(
      503,
    );
    expect(res.body.error.code).toBe('ai_unavailable');
  });
});
