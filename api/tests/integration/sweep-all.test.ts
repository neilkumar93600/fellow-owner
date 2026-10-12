import { eq } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import type { SweepOptions } from '../../src/ai/types.js';
import { buildContainer } from '../../src/container.js';
import { inbound, posts } from '../../src/db/schema/index.js';
import { ANALYSIS_LEASE_SECONDS } from '../../src/repositories/posts.repo.js';
import { sweepAll } from '../../src/workers/sweep-all.js';
import { createFactories } from '../helpers/factories.js';
import { closeDb, db, resetDatabase } from '../helpers/test-db.js';

const container = buildContainer();
const factories = createFactories(container);

/** sweepAll with a stub analyzer.sweep that records the spaces (and options) it was called with. */
async function sweptSpaces(
  sweep?: (spaceId: string, options?: SweepOptions) => Promise<void>,
): Promise<{ count: number; calls: { spaceId: string; options?: SweepOptions }[] }> {
  const calls: { spaceId: string; options?: SweepOptions }[] = [];
  const count = await sweepAll({
    ...container,
    analyzer: {
      ...container.analyzer,
      async sweep(spaceId, options) {
        calls.push({ spaceId, options });
        await sweep?.(spaceId, options);
        return { claimed: 1, remaining: 0 };
      },
    },
  });
  return { count, calls };
}

async function spaceWithPost(handle: string) {
  const made = await factories.space({ handle });
  const room = made.communities[0];
  if (!room) throw new Error('factory made no community');
  const post = await factories.post(made.space.id, room.id, made.ownerMembership.id);
  return { spaceId: made.space.id, post };
}

afterAll(async () => {
  await closeDb();
});

beforeEach(async () => {
  await resetDatabase();
});

describe('sweepAll', () => {
  it('sweeps a space whose only pending item is a pitch', async () => {
    const made = await factories.space({ handle: 'inbox' });
    const fan = await factories.member(made.space.id);
    await factories.pitch(made.space.id, fan.membership.id);

    const { count, calls } = await sweptSpaces();
    expect(count).toBe(1);
    expect(calls.map((call) => call.spaceId)).toEqual([made.space.id]);
  });

  it('sweeps a space with a pending post and a pending pitch once', async () => {
    const { spaceId } = await spaceWithPost('both');
    const fan = await factories.member(spaceId);
    await factories.pitch(spaceId, fan.membership.id);

    const { calls } = await sweptSpaces();
    expect(calls.map((call) => call.spaceId)).toEqual([spaceId]);
  });

  it('skips items under a live lease and picks up expired ones', async () => {
    const live = await spaceWithPost('live');
    const expired = await spaceWithPost('expired');
    const expiredAt = new Date(Date.now() - (ANALYSIS_LEASE_SECONDS + 60) * 1000);
    await db.update(posts).set({ analysisClaimedAt: new Date() }).where(eq(posts.id, live.post.id));
    await db
      .update(posts)
      .set({ analysisClaimedAt: expiredAt })
      .where(eq(posts.id, expired.post.id));

    const liveInbox = await factories.space({ handle: 'live_inbox' });
    const fan = await factories.member(liveInbox.space.id);
    const pitch = await factories.pitch(liveInbox.space.id, fan.membership.id);
    await db.update(inbound).set({ analysisClaimedAt: new Date() }).where(eq(inbound.id, pitch.id));

    const { calls } = await sweptSpaces();
    expect(calls.map((call) => call.spaceId)).toEqual([expired.spaceId]);
  });

  it('ignores soft-deleted pending posts', async () => {
    const { post } = await spaceWithPost('deleted');
    await db.update(posts).set({ deletedAt: new Date() }).where(eq(posts.id, post.id));

    const { count, calls } = await sweptSpaces();
    expect(count).toBe(0);
    expect(calls).toEqual([]);
  });

  it('runs at most 5 spaces at once, waits for each, and survives a failing space', async () => {
    const spaceIds: string[] = [];
    for (let i = 0; i < 7; i++) spaceIds.push((await spaceWithPost(`many_${i}`)).spaceId);
    const failing = spaceIds[2];

    let inFlight = 0;
    let peak = 0;
    const { count, calls } = await sweptSpaces(async (spaceId) => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 20));
      inFlight--;
      if (spaceId === failing) throw new Error('space broke');
    });

    expect(count).toBe(7);
    expect(calls.map((call) => call.spaceId).sort()).toEqual([...spaceIds].sort());
    expect(calls.every((call) => call.options?.wait === true)).toBe(true);
    expect(peak).toBe(5);
  });

  it('resolves only once the analyses are done (nothing left in the background)', async () => {
    const { post } = await spaceWithPost('real');

    expect(await sweepAll(container)).toBe(1);
    // No whenIdle(): the cron sweep must not leave the analyses running after it resolves.
    const [row] = await db
      .select({ status: posts.analysisStatus })
      .from(posts)
      .where(eq(posts.id, post.id));
    expect(row?.status).toBe('done');
  });
});
