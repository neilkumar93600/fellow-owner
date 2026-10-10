import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createAuth } from '../../src/auth/index.js';
import { buildContainer } from '../../src/container.js';
import { createApp } from '../../src/create-app.js';
import { user } from '../../src/db/schema/auth.js';
import { spaces } from '../../src/db/schema/spaces.js';
import { isImageBytes, type Storage } from '../../src/lib/storage.js';
import { type SignedIn, signInWithOtp, TEST_ORIGIN } from '../helpers/auth.js';
import { createFactories, type TestSpace } from '../helpers/factories.js';
import { closeDb, resetDatabase } from '../helpers/test-db.js';

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52];
const JPEG = [0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1];
const WEBP = [...Buffer.from('RIFF'), 36, 0, 0, 0, ...Buffer.from('WEBPVP8 ')];
const HTML = [...Buffer.from('<html><script>alert(1)</script>')];

/** In-memory bucket keyed like the real one. */
function memoryStorage() {
  const objects = new Map<string, Uint8Array>();
  const storage: Storage = {
    enabled: true,
    async presignPut(key, contentType) {
      return { url: `https://bucket.test/${key}`, headers: { 'Content-Type': contentType } };
    },
    async presignGet(key) {
      return `https://bucket.test/${key}`;
    },
    async readStart(key, bytes) {
      return objects.get(key)?.slice(0, bytes) ?? null;
    },
    async delete(key) {
      objects.delete(key);
    },
    async deletePrefix(prefix) {
      const keys = [...objects.keys()].filter((key) => key.startsWith(prefix));
      for (const key of keys) objects.delete(key);
      return keys.length;
    },
  };
  return { storage, objects };
}

const bucket = memoryStorage();
const container = buildContainer({
  storage: bucket.storage,
  auth: createAuth({ storage: bucket.storage }),
});
const app = createApp(container);
const factories = createFactories(container);

/** Puts `bytes` in the bucket under a fresh server-style key; returns its /api/media URL. */
function upload(kind: string, owner: string, bytes: number[], ext = 'png'): string {
  const key = `${kind}/${owner}/${randomUUID()}.${ext}`;
  bucket.objects.set(key, Uint8Array.from(bytes));
  return `/api/media/${key}`;
}
const keyOf = (url: string) => url.slice('/api/media/'.length);

let owner: SignedIn;
let mira: TestSpace;

beforeAll(async () => {
  await resetDatabase();
  owner = await signInWithOtp(app, 'mira@media.test', 'Mira Lane');
  mira = await factories.space({
    handle: 'mira',
    owner: { id: owner.userId, email: owner.email, name: 'Mira Lane' },
  });
});
afterAll(async () => {
  await container.background.whenIdle();
  await closeDb();
});

describe('isImageBytes', () => {
  it('knows JPEG, PNG and WebP and nothing else', () => {
    for (const ok of [PNG, JPEG, WEBP]) expect(isImageBytes(Uint8Array.from(ok))).toBe(true);
    expect(isImageBytes(Uint8Array.from(HTML))).toBe(false);
    expect(isImageBytes(new Uint8Array())).toBe(false);
  });
});

describe('uploaded images are checked by their bytes', () => {
  const settings = (profile: Record<string, unknown>) =>
    request(app)
      .put('/api/studio/settings')
      .set('Cookie', owner.cookie)
      .send({ profile: { displayName: 'Mira Lane', platforms: [], ...profile } });

  it('studio settings: a real PNG avatar and WebP cover are stored', async () => {
    const avatarUrl = upload('avatar', owner.userId, PNG);
    const coverUrl = upload('space_cover', mira.space.id, WEBP, 'webp');
    const res = await settings({ avatarUrl, coverUrl }).expect(200);
    expect(res.body).toMatchObject({ avatarUrl, coverUrl });
    // Saving again with the same values does not need the bucket.
    bucket.objects.delete(keyOf(avatarUrl));
    await settings({ avatarUrl, coverUrl }).expect(200);
  });

  it('studio settings: a non-image is rejected (400) and deleted', async () => {
    const avatarUrl = upload('avatar', owner.userId, HTML);
    const res = await settings({ avatarUrl }).expect(400);
    expect(res.body.error.code).toBe('validation_error');
    expect(bucket.objects.has(keyOf(avatarUrl))).toBe(false);
    const coverUrl = upload('space_cover', mira.space.id, HTML);
    await settings({ coverUrl }).expect(400);
    expect(bucket.objects.has(keyOf(coverUrl))).toBe(false);
  });

  it('studio settings: a missing upload is 400; other links keep their rules', async () => {
    const missing = `/api/media/avatar/${owner.userId}/${randomUUID()}.png`;
    expect((await settings({ avatarUrl: missing }).expect(400)).body.error.code).toBe(
      'validation_error',
    );
    await settings({ avatarUrl: 'https://cdn.example.com/mira.jpg' }).expect(200);
  });

  it('community cover: checked on update, unchanged covers pass', async () => {
    const community = mira.communities[0];
    if (!community) throw new Error('no community');
    const patch = (body: Record<string, unknown>) =>
      request(app)
        .patch(`/api/studio/communities/${community.id}`)
        .set('Cookie', owner.cookie)
        .send(body);
    const bad = upload('community_cover', mira.space.id, HTML);
    expect((await patch({ coverUrl: bad }).expect(400)).body.error.code).toBe('validation_error');
    expect(bucket.objects.has(keyOf(bad))).toBe(false);
    const good = upload('community_cover', mira.space.id, JPEG, 'jpg');
    expect((await patch({ coverUrl: good }).expect(200)).body.coverUrl).toBe(good);
  });

  it("a fan's Better Auth avatar (user.image) is checked too", async () => {
    const fan = await signInWithOtp(app, 'priya@media.test', 'Priya Shah');
    const update = (image: string) =>
      request(app)
        .post('/api/auth/update-user')
        .set('Origin', TEST_ORIGIN)
        .set('Cookie', fan.cookie)
        .send({ image });
    const bad = upload('member_avatar', fan.userId, HTML);
    const res = await update(bad);
    expect(res.status).toBe(400);
    expect(bucket.objects.has(keyOf(bad))).toBe(false);
    const good = upload('member_avatar', fan.userId, PNG);
    expect((await update(good)).status).toBe(200);
    const [row] = await container.db.select().from(user).where(eq(user.id, fan.userId));
    expect(row?.image).toBe(good);
    // A plain link keeps today's rules.
    expect((await update('https://cdn.example.com/priya.jpg')).status).toBe(200);
  });
});

describe('account deletion', () => {
  it('beforeDelete is safe to run twice and deletes the bucket images', async () => {
    const solo = await signInWithOtp(app, 'solo@media.test', 'Solo Owner');
    const own = await factories.space({
      handle: 'solo',
      owner: { id: solo.userId, email: solo.email, name: 'Solo Owner' },
    });
    // Solo is also a fan of Mira's space.
    const community = mira.communities[0];
    await factories.member(mira.space.id, {
      user: { id: solo.userId, email: solo.email, name: 'Solo Owner' },
      communityIds: community ? [community.id] : [],
    });
    const mine = [
      upload('avatar', solo.userId, PNG),
      upload('member_avatar', solo.userId, PNG),
      upload('space_cover', own.space.id, PNG),
      upload('community_cover', own.space.id, PNG),
    ];
    const othersCover = upload('space_cover', mira.space.id, PNG);

    await container.services.account.beforeDelete(solo.userId);
    // A retry after Better Auth's own delete failed finishes cleanly.
    await container.services.account.beforeDelete(solo.userId);

    expect(await container.db.select().from(spaces).where(eq(spaces.id, own.space.id))).toEqual([]);
    for (const url of mine) expect(bucket.objects.has(keyOf(url))).toBe(false);
    expect(bucket.objects.has(keyOf(othersCover))).toBe(true);
  });

  it('a failing bucket never blocks the deletion', async () => {
    const failing = memoryStorage();
    failing.storage.deletePrefix = async () => {
      throw new Error('bucket down');
    };
    const other = buildContainer({ storage: failing.storage });
    const gone = await signInWithOtp(app, 'gone@media.test', 'Gone Owner');
    await factories.space({
      handle: 'gone',
      owner: { id: gone.userId, email: gone.email, name: 'Gone Owner' },
    });
    await expect(other.services.account.beforeDelete(gone.userId)).resolves.toBeUndefined();
  });
});
