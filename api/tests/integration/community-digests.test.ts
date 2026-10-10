import { and, eq, isNotNull } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { buildContainer } from '../../src/container.js';
import { createApp } from '../../src/create-app.js';
import { digests } from '../../src/db/schema/ai.js';
import { type CommunityRow, communities } from '../../src/db/schema/communities.js';
import { createDigestWriter } from '../../src/workers/community-digests.js';
import { type SignedIn, signInWithOtp } from '../helpers/auth.js';
import { createFactories, type TestSpace } from '../helpers/factories.js';
import { closeDb, resetDatabase } from '../helpers/test-db.js';

const container = buildContainer();
const app = createApp(container);
const factories = createFactories(container);
const writer = createDigestWriter(container);

// A Monday afternoon (the tick's slot); the ISO week starts that day.
const NOW = new Date('2026-10-12T13:00:00Z');
const MONDAY = '2026-10-12';
const daysBefore = (days: number) => new Date(NOW.getTime() - days * 864e5);

let owner: SignedIn;
let mira: TestSpace;
let busy: CommunityRow;
let quiet: CommunityRow;
let archived: CommunityRow;

const communityDigests = () =>
  container.db
    .select()
    .from(digests)
    .where(and(eq(digests.spaceId, mira.space.id), isNotNull(digests.communityId)));

beforeAll(async () => {
  await resetDatabase();
  owner = await signInWithOtp(app, 'mira@digests.test', 'Mira Lane');
  mira = await factories.space({
    handle: 'mira',
    owner: { id: owner.userId, email: owner.email, name: 'Mira Lane' },
    communities: [
      { name: 'Food Finds', slug: 'food-finds' },
      { name: 'Quiet Corner', slug: 'quiet-corner' },
      { name: 'Old Stuff', slug: 'old-stuff' },
    ],
  });
  [busy, quiet, archived] = mira.communities as [CommunityRow, CommunityRow, CommunityRow];
  const { membership } = await factories.member(mira.space.id, {
    communityIds: [busy.id, quiet.id, archived.id],
  });
  await factories.post(mira.space.id, busy.id, membership.id, {
    title: 'Tacos al pastor in Austin',
    createdAt: daysBefore(2),
  });
  await factories.post(mira.space.id, busy.id, membership.id, {
    title: 'Pho in Houston',
    createdAt: daysBefore(5),
  });
  // Only an old post: the quiet community gets no digest.
  await factories.post(mira.space.id, quiet.id, membership.id, { createdAt: daysBefore(10) });
  await factories.post(mira.space.id, archived.id, membership.id, { createdAt: daysBefore(1) });
  await container.db
    .update(communities)
    .set({ archivedAt: daysBefore(1) })
    .where(eq(communities.id, archived.id));
});
afterAll(async () => {
  await container.background.whenIdle();
  await closeDb();
});

describe('community digests', () => {
  it('writes one digest for each active, non-archived community, dated the ISO Monday', async () => {
    expect(await writer.writeDue(NOW)).toBe(1);
    const rows = await communityDigests();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ communityId: busy.id, periodDate: MONDAY });
    expect(rows[0]?.content.summary).toEqual(expect.any(String));
    expect(rows[0]?.content.standouts).toEqual(expect.any(Array));
  });

  it('does not write a second digest in the same week', async () => {
    const spy = vi.spyOn(container.ai, 'communityDigest');
    try {
      expect(await writer.writeDue(new Date('2026-10-14T09:00:00Z'))).toBe(0);
      expect(spy).not.toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
    expect(await communityDigests()).toHaveLength(1);
  });

  it('StudioCommunity.digest returns the summary; quiet communities have none', async () => {
    const res = await request(app)
      .get('/api/studio/communities')
      .set('Cookie', owner.cookie)
      .expect(200);
    const items = res.body as Array<{ id: string; digest: string | null }>;
    const [row] = await communityDigests();
    expect(items.find((c) => c.id === busy.id)?.digest).toBe(row?.content.summary);
    expect(items.find((c) => c.id === quiet.id)?.digest).toBeNull();
  });

  it('one failed community does not stop the others; it is retried on the next run', async () => {
    const other = await factories.space({ communities: [{ name: 'Hikes', slug: 'hikes' }] });
    const [hikes] = other.communities as [CommunityRow];
    const { membership } = await factories.member(other.space.id, { communityIds: [hikes.id] });
    await factories.post(other.space.id, hikes.id, membership.id, {
      createdAt: new Date('2026-10-18T10:00:00Z'),
    });
    await factories.post(mira.space.id, busy.id, null, {
      createdAt: new Date('2026-10-18T10:00:00Z'),
    });
    const nextWeek = new Date('2026-10-19T13:00:00Z');
    const spy = vi
      .spyOn(container.ai, 'communityDigest')
      .mockRejectedValueOnce(new Error('provider down'));
    try {
      expect(await writer.writeDue(nextWeek)).toBe(1);
    } finally {
      spy.mockRestore();
    }
    expect(await writer.writeDue(nextWeek)).toBe(1);
    expect(await writer.writeDue(nextWeek)).toBe(0);
  });
});
