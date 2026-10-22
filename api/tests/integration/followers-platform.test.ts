import { PLATFORM_FANS_LIMITS } from '@fellow-owners/shared';
import { and, eq } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { env } from '../../src/config/env.js';
import { buildContainer } from '../../src/container.js';
import { createApp } from '../../src/create-app.js';
import { followers } from '../../src/db/schema/followers.js';
import { imports } from '../../src/db/schema/later.js';
import { withinCap } from '../../src/middlewares/rate-limit.js';
import { PLATFORM_FANS_RUNS_PER_DAY_ALL } from '../../src/services/followers.service.js';
import instagramProfile from '../fixtures/apify/instagram.json' with { type: 'json' };
import instagramComments from '../fixtures/apify/instagram-comments.json' with { type: 'json' };
import { type SignedIn, signInWithOtp } from '../helpers/auth.js';
import { createFactories, type TestSpace } from '../helpers/factories.js';
import { closeDb, db, resetDatabase } from '../helpers/test-db.js';

// No provider keys: sample mode. Never calls Apify or YouTube.
const offEnv = {
  ...env,
  APIFY_TOKEN: undefined,
  APIFY_ENABLED: false,
  YOUTUBE_API_KEY: undefined,
  YOUTUBE_ENABLED: false,
};
const sample = buildContainer({ env: offEnv });
const sampleApp = createApp(sample);
// Apify on, with global fetch stubbed per test.
const live = buildContainer({ env: { ...offEnv, APIFY_TOKEN: 't', APIFY_ENABLED: true } });
const liveApp = createApp(live);
const factories = createFactories(sample);

let owner: SignedIn;
let mira: TestSpace;
let other: SignedIn;
let fan: SignedIn;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

/** Stubs Apify: the profile scraper and the comment scraper. Returns the actor paths called. */
function stubApify(comments: () => Response = () => json(instagramComments)) {
  const paths: string[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL | Request) => {
      const url = new URL(String(input));
      paths.push(url.pathname);
      return /comment/.test(url.pathname) ? comments() : json(instagramProfile);
    }),
  );
  return paths;
}

const importFans = (
  app: ReturnType<typeof createApp>,
  who: SignedIn | null,
  handle: string,
  url: string,
) => {
  const req = request(app).post(`/api/spaces/${handle}/followers/import/platform`);
  if (who) req.set('Cookie', who.cookie);
  return req.send({ url });
};

const rosterOf = (spaceId: string) =>
  db.select().from(followers).where(eq(followers.spaceId, spaceId));

beforeAll(async () => {
  await resetDatabase();
  owner = await signInWithOtp(sampleApp, 'owner@fans.test', 'Nat Owner');
  mira = await factories.space({
    owner: { id: owner.userId, email: owner.email, name: 'Nat Owner' },
    handle: 'natowner',
  });
  other = await signInWithOtp(sampleApp, 'other@fans.test', 'Other Owner');
  await factories.space({
    owner: { id: other.userId, email: other.email, name: 'Other Owner' },
    handle: 'otherfans',
  });
  fan = await signInWithOtp(sampleApp, 'fan@fans.test', 'A Fan');
});

afterEach(() => {
  vi.unstubAllGlobals();
});

afterAll(async () => {
  await live.background.whenIdle();
  await closeDb();
});

describe('POST /api/spaces/:handle/followers/import/platform', () => {
  it('is owner only: 401 signed out, 404 for a fan or another owner', async () => {
    const url = 'https://www.instagram.com/natgeo';
    await importFans(sampleApp, null, 'natowner', url).expect(401);
    await importFans(sampleApp, fan, 'natowner', url).expect(404);
    await importFans(sampleApp, other, 'natowner', url).expect(404);
    await importFans(sampleApp, owner, 'natowner', 'https://example.com/natgeo').expect(400);
  });

  it('X is count only: skipped unsupported, nothing written', async () => {
    const res = await importFans(liveApp, owner, 'natowner', 'https://x.com/NatGeo').expect(200);
    expect(res.body).toEqual({ status: 'skipped', platform: 'x', reason: 'unsupported' });
  });

  it('sample mode never writes made-up people into a real space', async () => {
    for (const url of [
      'https://www.instagram.com/someone',
      'https://www.tiktok.com/@someone',
      'https://www.youtube.com/@someone',
    ]) {
      const res = await importFans(sampleApp, owner, 'natowner', url).expect(200);
      expect(res.body).toMatchObject({ status: 'skipped', reason: 'sample' });
    }
    expect(await rosterOf(mira.space.id)).toEqual([]);
    expect(await db.select().from(imports).where(eq(imports.spaceId, mira.space.id))).toEqual([]);
  });

  it('imports live commenters, deduped against the existing roster', async () => {
    await sample.repos.followers.insert({
      spaceId: mira.space.id,
      name: 'Lena (added by hand)',
      handle: 'LENA.ROAMS',
      platform: 'instagram',
      source: 'manual',
    });
    const paths = stubApify();
    const res = await importFans(
      liveApp,
      owner,
      'natowner',
      'https://www.instagram.com/natgeo',
    ).expect(200);
    expect(res.body).toEqual({
      status: 'done',
      platform: 'instagram',
      imported: 2,
      existing: 1,
      posts: 4,
    });
    expect(paths).toEqual([
      '/v2/acts/apify~instagram-profile-scraper/run-sync-get-dataset-items',
      '/v2/acts/apify~instagram-comment-scraper/run-sync-get-dataset-items',
    ]);
    const [theo] = await db
      .select()
      .from(followers)
      .where(and(eq(followers.spaceId, mira.space.id), eq(followers.handle, 'theo.packslight')));
    expect(theo).toMatchObject({
      name: 'Theo Grant',
      platform: 'instagram',
      source: 'paste',
      note: 'How do you fit two weeks into one carry-on?',
    });
    // The creator's own replies are not fans.
    expect((await rosterOf(mira.space.id)).some((r) => r.handle === 'natgeo')).toBe(false);
  });

  it('maps an empty comment run to no_comments', async () => {
    stubApify(() => json([]));
    const res = await importFans(
      liveApp,
      other,
      'otherfans',
      'https://www.instagram.com/natgeo',
    ).expect(200);
    expect(res.body).toEqual({ status: 'skipped', platform: 'instagram', reason: 'no_comments' });
  });

  it(`allows ${PLATFORM_FANS_LIMITS.runsPerPlatformPerDay} live runs per space per platform a day, then 429`, async () => {
    stubApify();
    // `owner` used 1 Instagram run above.
    await importFans(liveApp, owner, 'natowner', 'https://www.instagram.com/natgeo').expect(200);
    const over = await importFans(
      liveApp,
      owner,
      'natowner',
      'https://www.instagram.com/natgeo',
    ).expect(429);
    expect(over.body.error.code).toBe('daily_cap_reached');
    // Another platform has its own count; sample runs and X are never counted.
    stubApify(() => json([]));
    await importFans(liveApp, owner, 'natowner', 'https://www.tiktok.com/@natgeo').expect(200);
    await importFans(sampleApp, owner, 'natowner', 'https://www.instagram.com/x1x').expect(200);
    await importFans(liveApp, owner, 'natowner', 'https://x.com/natgeo').expect(200);
  });
});

describe('auto-import after onboarding creates the space', () => {
  const body = (handle: string) => ({
    handle,
    displayName: 'New Creator',
    platforms: [
      {
        platform: 'instagram',
        url: 'https://www.instagram.com/natgeo',
        handle: 'natgeo',
        followers: 1000,
      },
      // Not fetched (no handle): left alone.
      { platform: 'tiktok', url: 'https://www.tiktok.com/@natgeo', followers: 10 },
      // X is count only.
      { platform: 'x', url: 'https://x.com/natgeo', handle: 'natgeo', followers: 5 },
    ],
    communities: [{ name: 'Budget Travel', tint: 'lime', icon: 'globe' }],
    tasteProfile: { promote: ['budget travel'], never: [], voice: [] },
  });

  it('imports the fetched platforms in the background', async () => {
    const creator = await signInWithOtp(liveApp, 'new@fans.test', 'New Creator');
    const paths = stubApify();
    const res = await request(liveApp)
      .post('/api/studio/space')
      .set('Cookie', creator.cookie)
      .send(body('newfans'))
      .expect(201);
    await live.background.whenIdle();
    const rows = await rosterOf(res.body.id);
    expect(rows.map((r) => r.handle).sort()).toEqual([
      'aiko.eats',
      'lena.roams',
      'theo.packslight',
    ]);
    expect(paths.every((p) => p.includes('instagram'))).toBe(true);
  });

  it('a failed fetch never affects space creation', async () => {
    const creator = await signInWithOtp(liveApp, 'broken@fans.test', 'Broken Fetch');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('network down');
      }),
    );
    const res = await request(liveApp)
      .post('/api/studio/space')
      .set('Cookie', creator.cookie)
      .send(body('brokenfans'))
      .expect(201);
    await live.background.whenIdle();
    expect(await rosterOf(res.body.id)).toEqual([]);
  });

  it('sample mode schedules nothing', async () => {
    const creator = await signInWithOtp(sampleApp, 'quiet@fans.test', 'Quiet Creator');
    await request(sampleApp)
      .post('/api/studio/space')
      .set('Cookie', creator.cookie)
      .send(body('quietfans'))
      .expect(201);
    expect((sample.background as unknown as { pending: number }).pending).toBe(0);
  });
});

// Last: it uses up the shared daily cap.
describe('shared daily cap', () => {
  it(`stops every space after ${PLATFORM_FANS_RUNS_PER_DAY_ALL} live runs a day in all`, async () => {
    const day = new Date().toISOString().slice(0, 10);
    for (let i = 0; i < PLATFORM_FANS_RUNS_PER_DAY_ALL; i++) {
      await withinCap({
        name: 'platform-fans-day',
        key: day,
        windowSeconds: 86_400,
        max: PLATFORM_FANS_RUNS_PER_DAY_ALL,
        redis: null,
      });
    }
    stubApify();
    const res = await importFans(
      liveApp,
      other,
      'otherfans',
      'https://www.tiktok.com/@natgeo',
    ).expect(429);
    expect(res.body.error.code).toBe('daily_cap_reached');
  });
});
