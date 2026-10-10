import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildContainer } from '../../src/container.js';
import { createApp } from '../../src/create-app.js';
import { db } from '../../src/db/client.js';
import { promotions } from '../../src/db/schema/promotions.js';
import { type SignedIn, signInWithOtp } from '../helpers/auth.js';
import { createFactories } from '../helpers/factories.js';
import { closeDb, resetDatabase } from '../helpers/test-db.js';

const container = buildContainer();
const app = createApp(container);
const factories = createFactories(container);
let owner: SignedIn;

const list = (qs: string) =>
  request(app).get(`/api/studio/promotions${qs}`).set('Cookie', owner.cookie);

beforeAll(async () => {
  await resetDatabase();
  owner = await signInWithOtp(app, 'mira@promo.test', 'Mira');
  const mira = await factories.space({
    owner: { id: owner.userId, email: owner.email, name: 'Mira' },
    handle: 'mira',
  });
  const fan = await factories.member(mira.space.id);
  const now = new Date();
  // 3 live, 2 draft, 1 unpublished
  const states = ['live', 'live', 'draft', 'live', 'draft', 'unpublished'] as const;
  for (const [i, state] of states.entries()) {
    const p = await factories.post(
      mira.space.id,
      mira.communities[0]?.id ?? '',
      fan.membership.id,
      {
        createdAt: new Date(now.getTime() - (10 - i) * 60_000),
      },
    );
    await db.insert(promotions).values({
      spaceId: mira.space.id,
      postId: p.id,
      createdByUserId: owner.userId,
      createdAt: new Date(now.getTime() - (10 - i) * 60_000),
      publishedAt: state === 'draft' ? null : now,
      unpublishedAt: state === 'unpublished' ? now : null,
    });
  }
});

afterAll(async () => {
  await container.background.whenIdle();
  await closeDb();
});

describe('GET /api/studio/promotions?state=', () => {
  it('filters server-side across pages', async () => {
    const first = await list('?state=live&limit=2').expect(200);
    expect(first.body.items).toHaveLength(2);
    expect(first.body.nextCursor).toBeTruthy();
    const second = await list(`?state=live&limit=2&cursor=${first.body.nextCursor}`).expect(200);
    expect(second.body.items).toHaveLength(1);
    expect(second.body.nextCursor).toBeNull();
    const all = [...first.body.items, ...second.body.items];
    expect(all.every((p: { state: string }) => p.state === 'live')).toBe(true);
    expect(first.body.counts).toEqual({ draft: 2, live: 3, unpublished: 1 });
  });

  it('without state returns every state, and a bad state is a 400', async () => {
    const res = await list('').expect(200);
    expect(res.body.items).toHaveLength(6);
    await list('?state=bogus').expect(400);
  });
});
