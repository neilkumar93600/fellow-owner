import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildContainer } from '../../src/container.js';
import { user } from '../../src/db/schema/auth.js';
import { communities } from '../../src/db/schema/communities.js';
import { spaces } from '../../src/db/schema/spaces.js';
import type { Storage } from '../../src/lib/storage.js';
import { purgeExpired } from '../../src/workers/purge.js';
import { createFactories } from '../helpers/factories.js';
import { closeDb, resetDatabase } from '../helpers/test-db.js';

const now = new Date('2026-10-12T12:00:00Z');
const hoursAgo = (hours: number) => new Date(now.getTime() - hours * 3_600_000);

/** In-memory bucket with each object's last-modified time. */
function memoryStorage() {
  const objects = new Map<string, Date>();
  const storage: Storage = {
    enabled: true,
    presignPut: async (key, contentType) => ({
      url: key,
      headers: { 'Content-Type': contentType },
    }),
    presignGet: async (key) => key,
    readStart: async () => null,
    async delete(key) {
      objects.delete(key);
    },
    deletePrefix: async () => 0,
    async listBefore(prefix, before) {
      return [...objects].filter(([k, at]) => k.startsWith(prefix) && at < before).map(([k]) => k);
    },
  };
  return { storage, objects };
}

const bucket = memoryStorage();
const container = buildContainer({ storage: bucket.storage });
const factories = createFactories(container);

afterAll(async () => {
  await container.background.whenIdle();
  await closeDb();
});

describe('purge: orphaned uploads', () => {
  const key = (kind: string, owner: string) => `${kind}/${owner}/${randomUUID()}.png`;
  const kept: string[] = [];
  let orphan = '';
  let recent = '';

  beforeAll(async () => {
    await resetDatabase();
    const {
      space,
      owner,
      communities: [community],
    } = await factories.space();
    if (!community) throw new Error('no community');
    const avatar = key('avatar', owner.id);
    const cover = key('space_cover', space.id);
    const communityCover = key('community_cover', space.id);
    const image = key('member_avatar', owner.id);
    const db = container.db;
    await db
      .update(spaces)
      .set({ avatarUrl: `/api/media/${avatar}`, coverUrl: `/api/media/${cover}` })
      .where(eq(spaces.id, space.id));
    await db
      .update(communities)
      .set({ coverUrl: `/api/media/${communityCover}` })
      .where(eq(communities.id, community.id));
    await db
      .update(user)
      .set({ image: `/api/media/${image}` })
      .where(eq(user.id, owner.id));
    kept.push(avatar, cover, communityCover, image);
    orphan = key('avatar', owner.id);
    recent = key('space_cover', space.id);
    for (const k of [...kept, orphan]) bucket.objects.set(k, hoursAgo(48));
    bucket.objects.set(recent, hoursAgo(2));
  });

  it('deletes uploads older than 24 h that no row points at, and keeps the rest', async () => {
    const result = await purgeExpired(container, now);
    expect(result.orphanedUploads).toBe(1);
    expect(bucket.objects.has(orphan)).toBe(false);
    for (const k of [...kept, recent]) expect(bucket.objects.has(k)).toBe(true);
    // A second run has nothing left to do.
    expect((await purgeExpired(container, now)).orphanedUploads).toBe(0);
  });

  it('a failing bucket is logged and never fails the purge', async () => {
    const failing = memoryStorage();
    failing.storage.listBefore = async () => {
      throw new Error('bucket down');
    };
    const other = buildContainer({ storage: failing.storage });
    await expect(purgeExpired(other, now)).resolves.toMatchObject({ orphanedUploads: 0 });
  });
});
