import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildContainer } from '../../src/container.js';
import { createApp } from '../../src/create-app.js';
import type { Storage } from '../../src/lib/storage.js';
import { MEDIA_READS_PER_MINUTE, PRESIGNS_PER_USER } from '../../src/routes/uploads.routes.js';
import { type SignedIn, signInWithOtp } from '../helpers/auth.js';
import { createFactories, type TestSpace } from '../helpers/factories.js';
import { closeDb, resetDatabase } from '../helpers/test-db.js';

/** In-memory bucket: records presigned keys and "stores" them when asked to. */
function fakeStorage(enabled = true) {
  const present = new Set<string>();
  let reads = 0;
  const storage: Storage = {
    enabled,
    async presignPut(key, contentType, size) {
      return {
        url: `https://bucket.test/${key}?sig=put&size=${size}`,
        headers: { 'Content-Type': contentType },
      };
    },
    async presignGet(key) {
      return `https://bucket.test/${key}?sig=get`;
    },
    async readStart(key) {
      reads += 1;
      return present.has(key) ? Uint8Array.from([0x89, 0x50, 0x4e, 0x47]) : null;
    },
    async delete(key) {
      present.delete(key);
    },
    async deletePrefix(prefix) {
      const keys = [...present].filter((key) => key.startsWith(prefix));
      for (const key of keys) present.delete(key);
      return keys.length;
    },
  };
  return { storage, present, reads: () => reads };
}

const on = fakeStorage(true);
const onApp = createApp(buildContainer({ storage: on.storage }));
const offApp = createApp(buildContainer({ storage: fakeStorage(false).storage }));
const factories = createFactories(buildContainer({ storage: on.storage }));

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

describe('image uploads', () => {
  let a: TestSpace;
  let b: TestSpace;
  let ownerA: SignedIn;
  let ownerB: SignedIn;

  beforeAll(async () => {
    await resetDatabase();
    a = await factories.space();
    b = await factories.space();
    ownerA = await signInWithOtp(onApp, a.owner.email, a.owner.name);
    ownerB = await signInWithOtp(onApp, b.owner.email, b.owner.name);
  });

  afterAll(closeDb);

  const presign = (app: typeof onApp, cookie: string, body: Record<string, unknown>) =>
    request(app).post('/api/uploads/presign').set('Cookie', cookie).send(body);

  it('requires a session', async () => {
    await request(onApp)
      .post('/api/uploads/presign')
      .send({ kind: 'avatar', contentType: 'image/png', size: 1000 })
      .expect(401);
  });

  it('rejects a GIF', async () => {
    const res = await presign(onApp, ownerA.cookie, {
      kind: 'avatar',
      contentType: 'image/gif',
      size: 1000,
    });
    expect(res.status).toBe(400);
  });

  it('rejects files over 5 MB', async () => {
    const res = await presign(onApp, ownerA.cookie, {
      kind: 'avatar',
      contentType: 'image/png',
      size: 5 * 1024 * 1024 + 1,
    });
    expect(res.status).toBe(400);
  });

  it('builds the key on the server under the caller prefix', async () => {
    const res = await presign(onApp, ownerA.cookie, {
      kind: 'avatar',
      contentType: 'image/webp',
      size: 2048,
      key: 'avatar/someone-else/evil.png',
    });
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(res.body.key).toMatch(new RegExp(`^avatar/${ownerA.userId}/${UUID}\\.webp$`));
    expect(res.body.url).toBe(`/api/media/${res.body.key}`);
    expect(res.body.method).toBe('PUT');
    expect(res.body.headers).toEqual({ 'Content-Type': 'image/webp' });
    expect(res.body.uploadUrl).toContain(res.body.key);
  });

  it('puts space covers under the space id', async () => {
    const res = await presign(onApp, ownerA.cookie, {
      kind: 'space_cover',
      contentType: 'image/jpeg',
      size: 1000,
    });
    expect(res.status).toBe(200);
    expect(res.body.key).toMatch(new RegExp(`^space_cover/${a.space.id}/${UUID}\\.jpg$`));
  });

  it('presigns a community cover for the owner of that community', async () => {
    const res = await presign(onApp, ownerA.cookie, {
      kind: 'community_cover',
      contentType: 'image/png',
      size: 1000,
      communityId: a.communities[0]?.id,
    });
    expect(res.status).toBe(200);
    expect(res.body.key).toMatch(new RegExp(`^community_cover/${a.space.id}/${UUID}\\.png$`));
  });

  it('gives another owner 404 for a foreign community, and 400 without communityId', async () => {
    const foreign = await presign(onApp, ownerB.cookie, {
      kind: 'community_cover',
      contentType: 'image/png',
      size: 1000,
      communityId: a.communities[0]?.id,
    });
    expect(foreign.status).toBe(404);
    const missing = await presign(onApp, ownerA.cookie, {
      kind: 'community_cover',
      contentType: 'image/png',
      size: 1000,
    });
    expect(missing.status).toBe(400);
  });

  it('keeps covers owner-only: a fan without a space gets 404', async () => {
    const fan = await factories.user();
    const fanSession = await signInWithOtp(onApp, fan.email, fan.name);
    const res = await presign(onApp, fanSession.cookie, {
      kind: 'space_cover',
      contentType: 'image/png',
      size: 1000,
    });
    expect(res.status).toBe(404);
    const avatar = await presign(onApp, fanSession.cookie, {
      kind: 'member_avatar',
      contentType: 'image/png',
      size: 1000,
    });
    expect(avatar.status).toBe(200);
  });

  it('answers 503 uploads_disabled when no bucket is configured', async () => {
    const owner = await signInWithOtp(offApp, a.owner.email, a.owner.name);
    const res = await presign(offApp, owner.cookie, {
      kind: 'avatar',
      contentType: 'image/png',
      size: 1000,
    });
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('uploads_disabled');
    const media = await request(offApp).get(
      `/api/media/avatar/${ownerA.userId}/${randomUUID()}.png`,
    );
    expect(media.status).toBe(503);
    expect(media.body.error.code).toBe('uploads_disabled');
  });

  describe('GET /api/media/*key', () => {
    it('redirects to a presigned GET for a stored object', async () => {
      const key = `avatar/${ownerA.userId}/${randomUUID()}.png`;
      on.present.add(key);
      const res = await request(onApp).get(`/api/media/${key}`);
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe(`https://bucket.test/${key}?sig=get`);
      expect(res.headers['cache-control']).toBe('public, max-age=3000');
    });

    it('never reads the bucket: a missing object 404s at the bucket after the redirect', async () => {
      const key = `avatar/${ownerA.userId}/${randomUUID()}.png`;
      const res = await request(onApp).get(`/api/media/${key}`);
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe(`https://bucket.test/${key}?sig=get`);
      expect(on.reads()).toBe(0);
    });

    it(`is limited to ${MEDIA_READS_PER_MINUTE} reads a minute per IP`, async () => {
      const res = await request(onApp)
        .get(`/api/media/avatar/${ownerA.userId}/${randomUUID()}.png`)
        .set('X-Real-IP', '203.0.113.80');
      expect(res.headers['ratelimit-limit']).toBe(String(MEDIA_READS_PER_MINUTE));
      expect(res.headers['ratelimit-remaining']).toBe(String(MEDIA_READS_PER_MINUTE - 1));
    });

    it('rejects traversal and keys outside the pattern', async () => {
      on.present.add('avatar/x/y.png');
      for (const path of [
        '/api/media/%2e%2e/secret',
        `/api/media/avatar/%2e%2e/${randomUUID()}.png`,
        '/api/media/avatar/x/y.png',
        `/api/media/other/${ownerA.userId}/${randomUUID()}.png`,
        `/api/media/avatar/${ownerA.userId}/${randomUUID()}.gif`,
        `/api/media/avatar/${ownerA.userId}/${randomUUID()}.png/extra`,
      ]) {
        const res = await request(onApp).get(path);
        expect(res.status, path).toBe(404);
      }
    });
  });

  it(`limits each user to ${PRESIGNS_PER_USER.hour} presigns an hour`, async () => {
    const user = await signInWithOtp(onApp, 'many-uploads@uploads.test', 'Many Uploads');
    const body = { kind: 'avatar', contentType: 'image/png', size: 1000 };
    for (let i = 0; i < PRESIGNS_PER_USER.hour; i++) {
      await presign(onApp, user.cookie, body).expect(200);
    }
    const res = await presign(onApp, user.cookie, body).expect(429);
    expect(res.body.error.code).toBe('rate_limited');
    // Another user is not affected.
    await presign(onApp, ownerB.cookie, body).expect(200);
  });
});
