import { LIMITS } from '@fellow-owners/shared';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { fakeEmbedding } from '../../src/ai/fake.js';
import { AiUnavailableError } from '../../src/ai/types.js';
import { buildContainer } from '../../src/container.js';
import { createApp } from '../../src/create-app.js';
import { inbound, posts } from '../../src/db/schema/index.js';
import { startOfUtcDay } from '../../src/lib/dates.js';
import { type SignedIn, signInWithOtp } from '../helpers/auth.js';
import { createFactories, type TestSpace } from '../helpers/factories.js';
import { closeDb, db, resetDatabase } from '../helpers/test-db.js';

const container = buildContainer();
const app = createApp(container);
const factories = createFactories(container);
let mira: TestSpace;
let owner: SignedIn;
let otherOwner: SignedIn;
let other: TestSpace;
let fan: SignedIn;
const ids: Record<string, string> = {};

const ask = (who: SignedIn | null, question: unknown = 'What do fans say about Lisbon food?') => {
  const req = request(app).post('/api/studio/ask');
  if (who) req.set('Cookie', who.cookie);
  return req.send({ question });
};

/** Embeds a row the way the analyzer would (fake vectors: shared words = close). */
async function embedPost(id: string, text: string) {
  await db
    .update(posts)
    .set({ embedding: fakeEmbedding(text) })
    .where(eq(posts.id, id));
}
async function embedPitch(id: string, text: string) {
  await db
    .update(inbound)
    .set({ embedding: fakeEmbedding(text) })
    .where(eq(inbound.id, id));
}

async function fillAskCap(spaceId: string, userId: string) {
  const used = await container.repos.aiRuns.countBySpaceTaskSince(
    spaceId,
    'askAI',
    startOfUtcDay(new Date()),
  );
  for (let i = used; i < LIMITS.ask.perDay; i += 1) {
    await container.repos.aiRuns.insert({
      spaceId,
      userId,
      task: 'askAI',
      model: 'fake',
      status: 'ok',
    });
  }
}

beforeAll(async () => {
  await resetDatabase();
  owner = await signInWithOtp(app, 'mira@ask.test', 'Mira Lane');
  mira = await factories.space({
    handle: 'mira',
    displayName: 'Mira Lane',
    owner: { id: owner.userId, email: owner.email, name: 'Mira Lane' },
  });
  otherOwner = await signInWithOtp(app, 'theo@ask.test', 'Theo Park');
  other = await factories.space({
    handle: 'theo',
    displayName: 'Theo Park',
    owner: { id: otherOwner.userId, email: otherOwner.email, name: 'Theo Park' },
  });
  fan = await signInWithOtp(app, 'priya@ask.test', 'Priya Shah');
  const community = mira.communities[0]!.id;
  const { membership } = await factories.member(mira.space.id, {
    user: { id: fan.userId, email: 'priya@ask.test', name: 'Priya Shah' },
    communityIds: [community],
  });

  const post = await factories.post(mira.space.id, community, membership.id, {
    title: 'Lisbon food walk',
    body: 'A cheap Lisbon food walk with pastel de nata stops for fans on a budget.',
  });
  await embedPost(post.id, `${post.title}\n\n${post.body}`);
  ids.post = post.id;

  const hidden = await factories.post(mira.space.id, community, membership.id, {
    title: 'Hidden Lisbon food post',
    body: 'Lisbon food tips that the creator hid from the feed.',
  });
  await embedPost(hidden.id, `${hidden.title}\n\n${hidden.body}`);
  await db.update(posts).set({ hiddenAt: new Date() }).where(eq(posts.id, hidden.id));
  ids.hidden = hidden.id;

  const pitch = await factories.pitch(mira.space.id, membership.id, {
    type: 'idea',
    subject: 'Lisbon food guide',
    body: 'Could you make a Lisbon food guide for people travelling on a budget?',
  });
  await embedPitch(pitch.id, `${pitch.subject}\n\n${pitch.body}`);
  ids.pitch = pitch.id;

  // Theo's space has a Lisbon post too: Mira must never see it.
  const theoCommunity = other.communities[0]!.id;
  const theoPost = await factories.post(other.space.id, theoCommunity, null, {
    title: 'Lisbon food in Theo space',
    body: 'Lisbon food notes that belong to another creator entirely.',
  });
  await embedPost(theoPost.id, `${theoPost.title}\n\n${theoPost.body}`);
  ids.theoPost = theoPost.id;
});

afterEach(() => {
  vi.restoreAllMocks();
});

afterAll(async () => {
  await container.background.whenIdle();
  await closeDb();
});

describe('POST /api/studio/ask', () => {
  it('answers from the matched items with dashboard links and counts the ask', async () => {
    const res = await ask(owner).expect(200);
    expect(res.body.answer).toEqual(expect.any(String));
    expect(res.body.answer.length).toBeGreaterThan(0);
    expect(res.body.citations.length).toBeGreaterThan(0);
    const refIds = res.body.citations.map((c: { refId: string }) => c.refId);
    expect(refIds).not.toContain(ids.hidden);
    expect(refIds).not.toContain(ids.theoPost);
    for (const citation of res.body.citations) {
      expect([ids.post, ids.pitch]).toContain(citation.refId);
      expect(citation.href).toBe(
        citation.refType === 'post'
          ? `/dashboard/ideas?item=${citation.refId}`
          : `/dashboard/inbox?item=${citation.refId}`,
      );
      expect(citation.title).toEqual(expect.any(String));
    }
    expect(res.body.asksLeftToday).toBe(LIMITS.ask.perDay - 1);
  });

  it('drops citations outside the matched set and renumbers the answer', async () => {
    const spy = vi.spyOn(container.ai, 'askAI').mockImplementationOnce(async (input) => {
      const real = input.matches.find((m) => m.refId === ids.post);
      if (!real) throw new Error('the post should be among the matches');
      return {
        answer: 'Fans want a guide [1] and a hidden thing [2].',
        citations: [
          { refType: 'post', refId: ids.theoPost!, title: 'Not in the matches' },
          { refType: 'post', refId: real.refId, title: 'Model title' },
        ],
        model: 'test',
      };
    });
    const res = await ask(owner).expect(200);
    expect(spy).toHaveBeenCalledOnce();
    const input = spy.mock.calls[0]![0];
    expect(input.matches.map((m) => m.refId)).not.toContain(ids.hidden);
    expect(input.matches.length).toBeLessThanOrEqual(LIMITS.ask.matches);
    expect(res.body.citations).toEqual([
      {
        refType: 'post',
        refId: ids.post,
        title: 'Lisbon food walk',
        href: `/dashboard/ideas?item=${ids.post}`,
      },
    ]);
    expect(res.body.answer).toBe('Fans want a guide and a hidden thing [1].');
  });

  it('answers plainly without calling the model when nothing is embedded', async () => {
    const lonely = await signInWithOtp(app, 'ana@ask.test', 'Ana Ruiz');
    const space = await factories.space({
      handle: 'ana',
      displayName: 'Ana Ruiz',
      owner: { id: lonely.userId, email: lonely.email, name: 'Ana Ruiz' },
    });
    await factories.post(space.space.id, space.communities[0]!.id, null, {
      title: 'Not embedded yet',
      body: 'This post has no embedding so search cannot find it.',
    });
    const spy = vi.spyOn(container.ai, 'askAI');
    const res = await ask(lonely).expect(200);
    expect(spy).not.toHaveBeenCalled();
    expect(res.body).toEqual({
      answer: expect.stringMatching(/nothing in your space mentions that yet/i),
      citations: [],
      asksLeftToday: LIMITS.ask.perDay,
    });
  });

  it("another owner's ask never sees this space", async () => {
    const res = await ask(otherOwner).expect(200);
    const refIds = res.body.citations.map((c: { refId: string }) => c.refId);
    expect(refIds).not.toContain(ids.post);
    expect(refIds).not.toContain(ids.pitch);
  });

  it('404 for a signed-in user without a space, 401 signed out, 400 for a bad question', async () => {
    await ask(fan).expect(404);
    await ask(null).expect(401);
    await ask(owner, 'a').expect(400);
    await ask(owner, 'x'.repeat(LIMITS.ask.questionMax + 1)).expect(400);
  });

  it('AI unavailable -> 503 ai_unavailable, never 500', async () => {
    vi.spyOn(container.ai, 'askAI').mockRejectedValueOnce(
      new AiUnavailableError('provider', undefined, { task: 'askAI' }),
    );
    const res = await ask(owner).expect(503);
    expect(res.body.error.code).toBe('ai_unavailable');
  });

  it('429 once the daily asks are used, without calling the AI', async () => {
    await fillAskCap(mira.space.id, owner.userId);
    const embed = vi.spyOn(container.ai, 'embedItem');
    const res = await ask(owner).expect(429);
    expect(res.body.error.code).toBe('daily_cap_reached');
    expect(res.body.error.details).toMatchObject({ limit: LIMITS.ask.perDay });
    expect(embed).not.toHaveBeenCalled();
  });
});
