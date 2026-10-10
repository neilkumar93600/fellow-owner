import { LIMITS } from '@fellow-owners/shared';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildContainer } from '../../src/container.js';
import { inbound, posts } from '../../src/db/schema/index.js';
import { memberships } from '../../src/db/schema/memberships.js';
import { createFactories, type TestSpace } from '../helpers/factories.js';
import { closeDb, db, resetDatabase } from '../helpers/test-db.js';

const container = buildContainer();
const factories = createFactories(container);
const { search } = container.repos;

/** A unit vector mixing axis 0 and axis 1: angle `t` from axis 0. */
function vec(t: number): number[] {
  const v = new Array<number>(LIMITS.ai.embeddingDimensions).fill(0);
  v[0] = Math.cos(t);
  v[1] = Math.sin(t);
  return v;
}

describe('search.repo', () => {
  let s: TestSpace;
  let other: TestSpace;
  const ids: Record<string, string> = {};

  beforeAll(async () => {
    await resetDatabase();
    s = await factories.space();
    other = await factories.space();
    const community = s.communities[0]!.id;
    const author = await factories.member(s.space.id, { communityIds: [community] });

    const near = await factories.post(s.space.id, community, author.membership.id);
    const mid = await factories.post(s.space.id, community, author.membership.id);
    const far = await factories.post(s.space.id, community, author.membership.id);
    const hidden = await factories.post(s.space.id, community, author.membership.id);
    const deleted = await factories.post(s.space.id, community, author.membership.id);
    const noVector = await factories.post(s.space.id, community, author.membership.id);
    const foreign = await factories.post(
      other.space.id,
      other.communities[0]!.id,
      other.ownerMembership.id,
    );
    await db
      .update(posts)
      .set({ embedding: vec(0.1) })
      .where(eq(posts.id, near.id));
    await db
      .update(posts)
      .set({ embedding: vec(0.6) })
      .where(eq(posts.id, mid.id));
    await db
      .update(posts)
      .set({ embedding: vec(1.4) })
      .where(eq(posts.id, far.id));
    await db
      .update(posts)
      .set({ embedding: vec(0), hiddenAt: new Date() })
      .where(eq(posts.id, hidden.id));
    await db
      .update(posts)
      .set({ embedding: vec(0), deletedAt: new Date() })
      .where(eq(posts.id, deleted.id));
    await db
      .update(posts)
      .set({ embedding: vec(0) })
      .where(eq(posts.id, foreign.id));
    Object.assign(ids, {
      near: near.id,
      mid: mid.id,
      far: far.id,
      hidden: hidden.id,
      deleted: deleted.id,
      noVector: noVector.id,
      foreign: foreign.id,
    });

    const p1 = await factories.pitch(s.space.id, author.membership.id);
    const p2 = await factories.pitch(s.space.id, author.membership.id);
    const spam = await factories.pitch(s.space.id, author.membership.id);
    await db
      .update(inbound)
      .set({ embedding: vec(0.2) })
      .where(eq(inbound.id, p1.id));
    await db
      .update(inbound)
      .set({ embedding: vec(1.0) })
      .where(eq(inbound.id, p2.id));
    await db
      .update(inbound)
      .set({ embedding: vec(0), aiIsSpam: true })
      .where(eq(inbound.id, spam.id));
    Object.assign(ids, { p1: p1.id, p2: p2.id, spam: spam.id });

    const m1 = await factories.member(s.space.id);
    const m2 = await factories.member(s.space.id);
    const gone = await factories.member(s.space.id);
    await db
      .update(memberships)
      .set({ embedding: vec(0.05) })
      .where(eq(memberships.id, m1.membership.id));
    await db
      .update(memberships)
      .set({ embedding: vec(0.9) })
      .where(eq(memberships.id, m2.membership.id));
    await db
      .update(memberships)
      .set({ embedding: vec(0), removedAt: new Date() })
      .where(eq(memberships.id, gone.membership.id));
    await db
      .update(memberships)
      .set({ embedding: vec(0) })
      .where(eq(memberships.id, s.ownerMembership.id));
    Object.assign(ids, { m1: m1.membership.id, m2: m2.membership.id, gone: gone.membership.id });
  });

  afterAll(closeDb);

  it('nearestPosts orders by cosine distance and skips hidden, deleted, unembedded and foreign posts', async () => {
    const found = await search.nearestPosts(s.space.id, vec(0), 10);
    expect(found.map((row) => row.id)).toEqual([ids.near, ids.mid, ids.far]);
    expect(found[0]!.distance).toBeLessThan(found[1]!.distance);
    expect(found[0]!.distance).toBeCloseTo(1 - Math.cos(0.1), 5);
  });

  it('nearestPosts honours k, excludeId and maxDistance', async () => {
    expect((await search.nearestPosts(s.space.id, vec(0), 1)).map((r) => r.id)).toEqual([ids.near]);
    const excluded = await search.nearestPosts(s.space.id, vec(0), 10, { excludeId: ids.near });
    expect(excluded.map((r) => r.id)).toEqual([ids.mid, ids.far]);
    const close = await search.nearestPosts(s.space.id, vec(0), 10, { maxDistance: 0.35 });
    expect(close.map((r) => r.id)).toEqual([ids.near, ids.mid]);
  });

  it('nearestPitches orders by distance and skips spam', async () => {
    const found = await search.nearestPitches(s.space.id, vec(0), 10);
    expect(found.map((row) => row.id)).toEqual([ids.p1, ids.p2]);
  });

  it('nearestMembers skips removed members and the owner, and honours excludeMembershipId', async () => {
    const found = await search.nearestMembers(s.space.id, vec(0), 10);
    expect(found.map((row) => row.id)).toEqual([ids.m1, ids.m2]);
    const excluded = await search.nearestMembers(s.space.id, vec(0), 10, {
      excludeMembershipId: ids.m1,
    });
    expect(excluded.map((row) => row.id)).toEqual([ids.m2]);
  });
});
