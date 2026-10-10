import { PLATFORM_LOOKUP_LIMITS, type PlatformProfile } from '@fellow-owners/shared';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { env } from '../../src/config/env.js';
import { buildContainer } from '../../src/container.js';
import { createApp } from '../../src/create-app.js';
import { type SignedIn, signInWithOtp } from '../helpers/auth.js';
import { closeDb, resetDatabase } from '../helpers/test-db.js';

// Never call Apify from tests: no token means simulated profiles for non-demo handles.
const container = buildContainer({ env: { ...env, APIFY_TOKEN: undefined, APIFY_ENABLED: false } });
const app = createApp(container);
let creator: SignedIn;
let other: SignedIn;

const lookup = (who: SignedIn | null, url: string) => {
  const req = request(app).post('/api/studio/platform-lookup');
  if (who) req.set('Cookie', who.cookie);
  return req.send({ url });
};

beforeAll(async () => {
  await resetDatabase();
  creator = await signInWithOtp(app, 'lookup@platform.test', 'Lookup Creator');
  other = await signInWithOtp(app, 'other@platform.test', 'Other Creator');
});
afterAll(async () => {
  await container.background.whenIdle();
  await closeDb();
});

describe('POST /api/studio/platform-lookup', () => {
  it('401 signed out', async () => {
    await lookup(null, 'https://www.instagram.com/miralane').expect(401);
  });

  it('demo handles answer from fixtures', async () => {
    const res = await lookup(creator, 'https://www.youtube.com/@miralane').expect(200);
    expect(res.body).toMatchObject({
      status: 'ready',
      profile: { platform: 'youtube', handle: 'miralane', followers: 620_000, source: 'fixture' },
    });
  });

  it('hostile and unsupported links fail without a network call', async () => {
    const res = await lookup(creator, 'javascript:alert(1)').expect(200);
    expect(res.body).toEqual({ status: 'failed', reason: 'unsupported' });
  });

  it('429 after the per-minute limit, per user', async () => {
    // Two calls above already counted for `creator`.
    for (let i = 2; i < PLATFORM_LOOKUP_LIMITS.lookupsPerMinute; i += 1) {
      await lookup(creator, 'https://evil.com/x').expect(200);
    }
    const res = await lookup(creator, 'https://evil.com/x').expect(429);
    expect(res.body.error.code).toBe('rate_limited');
    // Another user is not affected.
    await lookup(other, 'https://evil.com/x').expect(200);
  });

  it('400 for a missing url', async () => {
    await request(app)
      .post('/api/studio/platform-lookup')
      .set('Cookie', other.cookie)
      .send({})
      .expect(400);
  });
});

describe('POST /api/studio/setup-suggestions', () => {
  it('turns profiles into loves, voice and groups with demand hints', async () => {
    const found = await lookup(other, 'https://www.tiktok.com/@miralane').expect(200);
    const profile = found.body.profile as PlatformProfile;
    const res = await request(app)
      .post('/api/studio/setup-suggestions')
      .set('Cookie', other.cookie)
      .send({ profiles: [profile] })
      .expect(200);
    expect(res.body).toMatchObject({
      displayName: 'Mira Lane',
      avatarUrl: '/demo/mira.jpg',
      bio: expect.any(String),
    });
    expect(res.body.loves.length).toBeGreaterThan(0);
    expect(res.body.communities.length).toBeGreaterThan(0);
    expect(res.body.communities[0].demand.label).toMatch(/of your last 10 videos are/);
  });

  it('rejects too many profiles and foreign avatars are not fetched', async () => {
    const res = await request(app)
      .post('/api/studio/setup-suggestions')
      .set('Cookie', other.cookie)
      .send({
        profiles: [
          {
            platform: 'instagram',
            handle: 'x',
            displayName: null,
            avatarUrl: 'http://169.254.169.254/latest/meta-data',
            bio: null,
            followers: null,
            verified: false,
            profileUrl: 'https://www.instagram.com/x',
            recent: [],
            source: 'apify',
            fetchedAt: '2026-10-09T00:00:00.000Z',
          },
        ],
      })
      .expect(200);
    expect(res.body.avatarUrl).toBeNull();
    await request(app)
      .post('/api/studio/setup-suggestions')
      .set('Cookie', other.cookie)
      .send({ profiles: [] })
      .expect(400);
  });

  it('401 signed out', async () => {
    await request(app).post('/api/studio/setup-suggestions').send({ profiles: [] }).expect(401);
  });
});
