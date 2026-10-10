import { LIMITS, type SimilarResult } from '@fellow-owners/shared';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildContainer } from '../../src/container.js';
import { createApp } from '../../src/create-app.js';
import { inbound, memberships, posts } from '../../src/db/schema/index.js';
import { embedMissing } from '../../src/db/seed/embed.js';
import { type SignedIn, signInWithOtp } from '../helpers/auth.js';
import { createFactories, type TestSpace } from '../helpers/factories.js';
import { closeDb, db, resetDatabase } from '../helpers/test-db.js';

const container = buildContainer();
const app = createApp(container);
const factories = createFactories(container);

/** A unit vector at angle `t` from axis 0 (cosine distance = 1 - cos t). */
function vec(t: number): number[] {
  const v = new Array<number>(LIMITS.ai.embeddingDimensions).fill(0);
  v[0] = Math.cos(t);
  v[1] = Math.sin(t);
  return v;
}

let mira: TestSpace;
let other: TestSpace;
let owner: SignedIn;
let otherOwner: SignedIn;
let fan: SignedIn;
let outsider: SignedIn;
const ids: Record<string, string> = {};

const get = (path: string, who: SignedIn | null) => {
  const req = request(app).get(path);
  if (who) req.set('Cookie', who.cookie);
  return req;
};
const setPost = (id: string, patch: Partial<typeof posts.$inferInsert>) =>
  db.update(posts).set(patch).where(eq(posts.id, id));
const setMember = (id: string, embedding: number[]) =>
  db.update(memberships).set({ embedding }).where(eq(memberships.id, id));

beforeAll(async () => {
  await resetDatabase();
  owner = await signInWithOtp(app, 'mira@similar.test', 'Mira Lane');
  mira = await factories.space({
    handle: 'mira',
    displayName: 'Mira Lane',
    owner: { id: owner.userId, email: owner.email, name: 'Mira Lane' },
  });
  otherOwner = await signInWithOtp(app, 'theo@similar.test', 'Theo Park');
  other = await factories.space({
    handle: 'theo',
    displayName: 'Theo Park',
    owner: { id: otherOwner.userId, email: otherOwner.email, name: 'Theo Park' },
  });
  fan = await signInWithOtp(app, 'priya@similar.test', 'Priya Shah');
  outsider = await signInWithOtp(app, 'nina@similar.test', 'Nina Outsider');

  const community = mira.communities[0]!.id;
  const author = await factories.member(mira.space.id, {
    user: { id: fan.userId, email: fan.email, name: 'Priya Shah' },
    communityIds: [community],
    headline: 'Video editor',
  });
  const helperA = await factories.member(mira.space.id, {
    communityIds: [community],
    headline: 'Food photographer',
  });
  const helperB = await factories.member(mira.space.id, {
    communityIds: [community],
    skills: ['Budgeting', 'Map making'],
  });
  const far = await factories.member(mira.space.id, { communityIds: [community] });
  const removed = await factories.member(mira.space.id, { communityIds: [community] });
  await container.repos.memberships.remove(mira.space.id, removed.membership.id);

  const source = await factories.post(mira.space.id, community, author.membership.id, {
    title: 'Lisbon food walk',
    body: 'A budget food walk. Budgeting tips for each stop.',
  });
  const near = await factories.post(mira.space.id, community, helperA.membership.id, {
    title: 'Near post',
  });
  const mid = await factories.post(mira.space.id, community, helperA.membership.id, {
    title: 'Mid post',
  });
  const farPost = await factories.post(mira.space.id, community, helperA.membership.id, {
    title: 'Far post',
  });
  const hidden = await factories.post(mira.space.id, community, helperA.membership.id);
  const deleted = await factories.post(mira.space.id, community, helperA.membership.id);
  const foreign = await factories.post(
    other.space.id,
    other.communities[0]!.id,
    other.ownerMembership.id,
  );
  await setPost(source.id, { embedding: vec(0) });
  await setPost(near.id, { embedding: vec(0.1) });
  await setPost(mid.id, { embedding: vec(0.5) });
  await setPost(farPost.id, { embedding: vec(1.4) });
  await setPost(hidden.id, { embedding: vec(0.05), hiddenAt: new Date() });
  await setPost(deleted.id, { embedding: vec(0.05), deletedAt: new Date() });
  await setPost(foreign.id, { embedding: vec(0.02) });

  await setMember(author.membership.id, vec(0.01));
  await setMember(helperB.membership.id, vec(0.2));
  await setMember(helperA.membership.id, vec(0.1));
  await setMember(far.membership.id, vec(1.5));
  await setMember(removed.membership.id, vec(0.02));
  await setMember(mira.ownerMembership.id, vec(0.03));

  Object.assign(ids, {
    source: source.id,
    near: near.id,
    mid: mid.id,
    far: farPost.id,
    hidden: hidden.id,
    deleted: deleted.id,
    foreign: foreign.id,
    author: author.membership.id,
    helperA: helperA.membership.id,
    helperB: helperB.membership.id,
    removed: removed.membership.id,
  });
});

afterAll(async () => {
  await closeDb();
});

describe('GET /api/posts/:postId/similar', () => {
  it('orders posts by distance and drops the source, far, hidden, deleted and foreign posts', async () => {
    const res = await get(`/api/posts/${ids.source}/similar`, fan).expect(200);
    const body = res.body as SimilarResult;
    expect(body.posts.map((p) => p.id)).toEqual([ids.near, ids.mid]);
  });

  it('lists people nearest first, without the author, the owner or removed members', async () => {
    const res = await get(`/api/posts/${ids.source}/similar`, fan).expect(200);
    const body = res.body as SimilarResult;
    expect(body.people.map((p) => p.membershipId)).toEqual([ids.helperA, ids.helperB]);
    expect(body.people[0]?.member.name).toBeTruthy();
  });

  it('uses the headline as the reason, else the top matching skill, else the first skill', async () => {
    const res = await get(`/api/posts/${ids.source}/similar`, fan).expect(200);
    const [a, b] = (res.body as SimilarResult).people;
    expect(a?.reason).toBe('Food photographer');
    expect(a?.headline).toBe('Food photographer');
    // The post body mentions "Budgeting": that skill wins over "Map making".
    expect(b?.reason).toBe('Budgeting');
    expect(b?.headline).toBeNull();
  });

  it('returns empty lists when the post has no embedding', async () => {
    const plain = await factories.post(
      mira.space.id,
      mira.communities[0]!.id,
      ids.author as string,
    );
    const res = await get(`/api/posts/${plain.id}/similar`, fan).expect(200);
    expect(res.body).toEqual({ posts: [], people: [] });
  });

  it('answers 401 signed out, 403 for a non-member, 404 for hidden, deleted and unknown posts', async () => {
    await get(`/api/posts/${ids.source}/similar`, null).expect(401);
    await get(`/api/posts/${ids.source}/similar`, outsider).expect(403);
    await get(`/api/posts/${ids.hidden}/similar`, fan).expect(404);
    await get(`/api/posts/${ids.deleted}/similar`, fan).expect(404);
    await get('/api/posts/00000000-0000-4000-8000-000000000000/similar', fan).expect(404);
  });
});

describe('GET /api/studio/posts/:postId/similar', () => {
  it('returns the same lists for the owner', async () => {
    const res = await get(`/api/studio/posts/${ids.source}/similar`, owner).expect(200);
    const body = res.body as SimilarResult;
    expect(body.posts.map((p) => p.id)).toEqual([ids.near, ids.mid]);
    expect(body.people.map((p) => p.membershipId)).toEqual([ids.helperA, ids.helperB]);
  });

  it('answers 404 to another owner, 401 signed out and 404 to a fan', async () => {
    await get(`/api/studio/posts/${ids.source}/similar`, otherOwner).expect(404);
    await get(`/api/studio/posts/${ids.source}/similar`, null).expect(401);
    await get(`/api/studio/posts/${ids.source}/similar`, fan).expect(404);
  });
});

describe('membership embeddings', () => {
  it('embeds a member in the background on join and again when the profile changes', async () => {
    const joiner = await signInWithOtp(app, 'joiner@similar.test', 'Jo Iner');
    await request(app)
      .post('/api/spaces/mira/join')
      .set('Cookie', joiner.cookie)
      .send({
        intro: 'I edit travel videos and plan budget trips.',
        communityIds: [mira.communities[0]!.id],
      })
      .expect(200);
    await container.background.whenIdle();
    const row = await container.repos.memberships.findByUser(mira.space.id, joiner.userId);
    expect(row?.embedding).toHaveLength(LIMITS.ai.embeddingDimensions);

    await db.update(memberships).set({ embedding: null }).where(eq(memberships.id, row!.id));
    await request(app)
      .patch('/api/spaces/mira/me')
      .set('Cookie', joiner.cookie)
      .send({ headline: 'Travel video editor', skills: ['Editing'] })
      .expect(200);
    await container.background.whenIdle();
    const after = await container.repos.memberships.findByUser(mira.space.id, joiner.userId);
    expect(after?.embedding).toHaveLength(LIMITS.ai.embeddingDimensions);
  });

  it('does not re-embed when only communities change', async () => {
    const joiner = await signInWithOtp(app, 'joiner2@similar.test', 'Jo Two');
    await request(app)
      .post('/api/spaces/mira/join')
      .set('Cookie', joiner.cookie)
      .send({ communityIds: [mira.communities[0]!.id] })
      .expect(200);
    await container.background.whenIdle();
    const row = await container.repos.memberships.findByUser(mira.space.id, joiner.userId);
    // No intro, headline or skills: nothing to embed.
    expect(row?.embedding).toBeNull();
    await request(app)
      .patch('/api/spaces/mira/me')
      .set('Cookie', joiner.cookie)
      .send({ communityIds: [mira.communities[1]!.id] })
      .expect(200);
    await container.background.whenIdle();
    const after = await container.repos.memberships.findByUser(mira.space.id, joiner.userId);
    expect(after?.embedding).toBeNull();
  });
});

describe('db:embed backfill', () => {
  it('fills missing embeddings on posts, pitches and memberships', async () => {
    const member = await factories.member(mira.space.id, {
      communityIds: [mira.communities[0]!.id],
      headline: 'Backfill me',
    });
    const post = await factories.post(mira.space.id, mira.communities[0]!.id, member.membership.id);
    const pitch = await factories.pitch(mira.space.id, member.membership.id);
    const result = await embedMissing(container);
    expect(result.failed).toBe(0);
    const [m] = await db.select().from(memberships).where(eq(memberships.id, member.membership.id));
    expect(m?.embedding).toHaveLength(LIMITS.ai.embeddingDimensions);
    const [p] = await db.select().from(posts).where(eq(posts.id, post.id));
    expect(p?.embedding).toHaveLength(LIMITS.ai.embeddingDimensions);
    const [repoPitch] = await db.select().from(inbound).where(eq(inbound.id, pitch.id));
    expect(repoPitch?.embedding).toHaveLength(LIMITS.ai.embeddingDimensions);
  });
});
