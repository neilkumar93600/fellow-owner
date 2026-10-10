import { eq } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { buildContainer } from '../../src/container.js';
import { createApp } from '../../src/create-app.js';
import type { CommunityRow } from '../../src/db/schema/communities.js';
import { asks, notifications } from '../../src/db/schema/later.js';
import { createChallengeCloser } from '../../src/workers/close-challenges.js';
import { type SignedIn, signInWithOtp } from '../helpers/auth.js';
import { createFactories, type TestSpace } from '../helpers/factories.js';
import { closeDb, resetDatabase } from '../helpers/test-db.js';

const container = buildContainer();
const app = createApp(container);
const factories = createFactories(container);
const closer = createChallengeCloser({ ...container, challenges: container.services.challenges });

let owner: SignedIn;
let fan: SignedIn;
let mira: TestSpace;
let food: CommunityRow;
let fanMembershipId: string;

const askRow = async (id: string) =>
  (await container.db.select().from(asks).where(eq(asks.id, id)))[0];

type StoredSummary = { shortlist?: unknown[]; summary?: string };
const stored = (row: { responseSummary: unknown } | undefined): StoredSummary =>
  (row?.responseSummary ?? {}) as StoredSummary;

const kinds = async (userId: string) =>
  (
    await container.db
      .select({ kind: notifications.kind })
      .from(notifications)
      .where(eq(notifications.userId, userId))
  ).map((row) => row.kind);

/** A challenge created through the API, then moved past its due date. */
async function overdueChallenge(title: string, entries: string[]): Promise<string> {
  const created = await request(app)
    .post('/api/studio/challenges')
    .set('Cookie', owner.cookie)
    .send({ title, communityId: food.id, dueAt: new Date(Date.now() + 864e5).toISOString() })
    .expect(201);
  for (const entry of entries) {
    await factories.post(mira.space.id, food.id, fanMembershipId, {
      title: entry,
      askId: created.body.id,
    });
  }
  await container.db
    .update(asks)
    .set({ dueAt: new Date(Date.now() - 60_000) })
    .where(eq(asks.id, created.body.id));
  return created.body.id;
}

beforeAll(async () => {
  await resetDatabase();
  owner = await signInWithOtp(app, 'mira@close.test', 'Mira Lane');
  mira = await factories.space({
    handle: 'mira',
    owner: { id: owner.userId, email: owner.email, name: 'Mira Lane' },
  });
  [food] = mira.communities as [CommunityRow];
  fan = await signInWithOtp(app, 'priya@close.test', 'Priya Shah');
  fanMembershipId = (
    await factories.member(mira.space.id, {
      user: { id: fan.userId, email: fan.email, name: 'Priya Shah' },
      communityIds: [food.id],
    })
  ).membership.id;
});
afterAll(async () => {
  await container.background.whenIdle();
  await closeDb();
});

describe('closing overdue challenges', () => {
  let tacosId: string;

  it('ask_posted reaches every member of the community (bulk insert)', async () => {
    tacosId = await overdueChallenge('Best $10 meal', ['Tacos in Austin', 'Pho in Houston']);
    await container.background.whenIdle();
    expect(await kinds(fan.userId)).toContain('ask_posted');
    expect(await kinds(owner.userId)).not.toContain('ask_posted');
  });

  it('listing reads an overdue challenge as closed but does not close it', async () => {
    const studio = await request(app)
      .get('/api/studio/challenges')
      .set('Cookie', owner.cookie)
      .expect(200);
    expect(studio.body.items.find((c: { id: string }) => c.id === tacosId).status).toBe('closed');
    await request(app).get('/api/spaces/mira/challenges').set('Cookie', fan.cookie).expect(200);
    await container.background.whenIdle();
    const row = await askRow(tacosId);
    expect(row?.status).toBe('open');
    expect(row?.responseSummary).toBeNull();
    expect(await kinds(fan.userId)).not.toContain('challenge_shortlisted');
  });

  it('the job closes it with a shortlist, an AI summary and shortlist notifications', async () => {
    const other = await factories.space();
    const otherAsk = await container.repos.asks.insert({
      spaceId: other.space.id,
      communityId: null,
      title: 'No entries here',
      dueAt: new Date(Date.now() - 60_000),
      status: 'open',
    });

    expect(await closer.closeOverdue(new Date())).toBe(2);
    await container.background.whenIdle();

    const row = await askRow(tacosId);
    expect(row?.status).toBe('closed');
    const summary = row?.responseSummary as {
      shortlist: Array<{ title: string }>;
      summary?: string;
    };
    expect(summary.shortlist.map((s) => s.title).sort()).toEqual([
      'Pho in Houston',
      'Tacos in Austin',
    ]);
    expect(summary.summary).toEqual(expect.any(String));
    expect(summary.summary?.length).toBeGreaterThan(0);
    expect(await kinds(fan.userId)).toContain('challenge_shortlisted');
    const detail = await request(app)
      .get(`/api/studio/challenges/${tacosId}`)
      .set('Cookie', owner.cookie)
      .expect(200);
    expect(detail.body.aiSummary).toBe(summary.summary);

    // Another space's overdue challenge is closed too; with no entries there is nothing to summarize.
    const empty = await askRow(otherAsk.id);
    expect(empty?.status).toBe('closed');
    expect(stored(empty).summary).toBeUndefined();
  });

  it('a second run closes nothing and sends nothing new', async () => {
    const before = (await kinds(fan.userId)).length;
    expect(await closer.closeOverdue(new Date())).toBe(0);
    await container.background.whenIdle();
    expect((await kinds(fan.userId)).length).toBe(before);
  });

  it('the AI failing still closes the challenge, without a summary', async () => {
    const id = await overdueChallenge('Sunrise spots', ['Griffith Observatory']);
    const spy = vi
      .spyOn(container.ai, 'challengeSummary')
      .mockRejectedValueOnce(new Error('provider down'));
    try {
      expect(await closer.closeOverdue(new Date())).toBe(1);
    } finally {
      spy.mockRestore();
    }
    const row = await askRow(id);
    expect(row?.status).toBe('closed');
    expect(stored(row).shortlist).toHaveLength(1);
    expect(stored(row).summary).toBeUndefined();
    const detail = await request(app)
      .get(`/api/studio/challenges/${id}`)
      .set('Cookie', owner.cookie)
      .expect(200);
    expect(detail.body.aiSummary).toBeNull();
  });

  it('a challenge not yet due is left open', async () => {
    const created = await request(app)
      .post('/api/studio/challenges')
      .set('Cookie', owner.cookie)
      .send({
        title: 'Later',
        communityId: null,
        dueAt: new Date(Date.now() + 864e5).toISOString(),
      })
      .expect(201);
    expect(await closer.closeOverdue(new Date())).toBe(0);
    expect((await askRow(created.body.id))?.status).toBe('open');
  });
});
