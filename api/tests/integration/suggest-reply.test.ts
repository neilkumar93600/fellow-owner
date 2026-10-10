import { DAILY_CAPS } from '@fellow-owners/shared';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { REPLY_TARGET_CHARS } from '../../src/ai/tasks/suggest-reply.js';
import { buildContainer } from '../../src/container.js';
import { createApp } from '../../src/create-app.js';
import type { InboundRow } from '../../src/db/schema/inbound.js';
import { startOfUtcDay } from '../../src/lib/dates.js';
import { type SignedIn, signInWithOtp } from '../helpers/auth.js';
import { createFactories, type TestSpace } from '../helpers/factories.js';
import { closeDb, resetDatabase } from '../helpers/test-db.js';

const container = buildContainer();
const app = createApp(container);
const factories = createFactories(container);
let mira: TestSpace;
let owner: SignedIn;
let fan: SignedIn;
let pitch: InboundRow;

const suggest = (who: SignedIn, id = pitch.id) =>
  request(app).post(`/api/studio/inbox/${id}/suggest-reply`).set('Cookie', who.cookie);

beforeAll(async () => {
  await resetDatabase();
  owner = await signInWithOtp(app, 'mira@reply.test', 'Mira Lane');
  mira = await factories.space({
    handle: 'mira',
    displayName: 'Mira Lane',
    owner: { id: owner.userId, email: owner.email, name: 'Mira Lane' },
  });
  fan = await signInWithOtp(app, 'priya@reply.test', 'Priya Shah');
  const { membership } = await factories.member(mira.space.id, {
    user: { id: fan.userId, email: 'priya@reply.test', name: 'Priya Shah' },
  });
  pitch = await factories.pitch(mira.space.id, membership.id, {
    subject: 'Film a Lisbon food walk together',
    body: 'I run a food walk in Lisbon and would love to show your viewers the best $3 lunches.',
  });
});
afterAll(async () => {
  await container.background.whenIdle();
  await closeDb();
});

describe('POST /api/studio/inbox/:id/suggest-reply', () => {
  it('drafts a reply in the creator voice, short and without contact details', async () => {
    const res = await suggest(owner).expect(200);
    expect(res.body).toEqual({ reply: expect.any(String) });
    expect(res.body.reply.length).toBeGreaterThan(0);
    expect(res.body.reply.length).toBeLessThanOrEqual(REPLY_TARGET_CHARS);
    expect(res.body.reply).not.toMatch(/@|https?:\/\/|\d{3}[-\s]?\d{3}[-\s]?\d{4}/);
  });

  it('404 for a non-owner', async () => {
    await suggest(fan).expect(404);
  });

  it('404 for an unknown pitch', async () => {
    await suggest(owner, '00000000-0000-4000-8000-000000000000').expect(404);
  });

  it('429 once the daily cap is reached', async () => {
    const used = await container.repos.aiRuns.countBySpaceTaskSince(
      mira.space.id,
      'suggestReply',
      startOfUtcDay(new Date()),
    );
    for (let i = used; i < DAILY_CAPS.suggestReply; i += 1) {
      await container.repos.aiRuns.insert({
        spaceId: mira.space.id,
        userId: owner.userId,
        task: 'suggestReply',
        model: 'fake',
        status: 'ok',
      });
    }
    const res = await suggest(owner).expect(429);
    expect(res.body.error.code).toBe('daily_cap_reached');
  });
});
