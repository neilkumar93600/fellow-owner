import { eq } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createFakeAiServices } from '../../src/ai/fake.js';
import type { AiServices } from '../../src/ai/types.js';
import { buildContainer } from '../../src/container.js';
import { createApp } from '../../src/create-app.js';
import { followers } from '../../src/db/schema/followers.js';
import { imports } from '../../src/db/schema/later.js';
import { withinCap } from '../../src/middlewares/rate-limit.js';
import { YOUTUBE_IMPORTS_PER_DAY } from '../../src/routes/followers.routes.js';
import { type SignedIn, signInWithOtp } from '../helpers/auth.js';
import { createFactories, type TestSpace } from '../helpers/factories.js';
import { closeDb, db, resetDatabase } from '../helpers/test-db.js';

const base = buildContainer();
const { repos } = base;
const factories = createFactories(base);

// No key: labelled sample data.
const sampleApp = createApp(base);

// A key, with global fetch stubbed per test; auto-tag calls are recorded and tag nothing.
const tagCalls: string[][] = [];
const ai: AiServices = {
  ...createFakeAiServices({ accounting: { aiRuns: repos.aiRuns } }),
  tagFollowers: async (input) => {
    tagCalls.push(input.followers.map((f) => f.name));
    return { tags: [], model: 'test' };
  },
};
const keyedApp = createApp(
  buildContainer({ env: { ...base.env, YOUTUBE_API_KEY: 'k', YOUTUBE_ENABLED: true }, ai }),
);

let owner: SignedIn;
// Live imports are capped per space a day: the error-path tests use their own space.
let other: SignedIn;
let fan: SignedIn;
let mira: TestSpace;

const post = (app: ReturnType<typeof createApp>, cookie: string, body: object) =>
  request(app).post('/api/studio/followers/import/youtube').set('Cookie', cookie).send(body);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const thread = (author: string, handle: string, text: string) => ({
  snippet: {
    topLevelComment: {
      snippet: {
        authorDisplayName: author,
        authorChannelUrl: `http://www.youtube.com/@${handle}`,
        textDisplay: text,
      },
    },
  },
});

/** Stubs YouTube; returns the URLs fetched. */
function stubYoutube(overrides: Partial<Record<string, () => Response>> = {}) {
  const urls: URL[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL | Request) => {
      const url = new URL(String(input));
      urls.push(url);
      const name = url.pathname.split('/').pop() ?? '';
      const custom = overrides[name];
      if (custom) return custom();
      if (name === 'channels') {
        return json({ items: [{ contentDetails: { relatedPlaylists: { uploads: 'UU1' } } }] });
      }
      if (name === 'playlistItems') return json({ items: [{ contentDetails: { videoId: 'v1' } }] });
      return json({
        items: [
          thread('Priya Shah', 'priya.wanders', 'Lisbon guide please'),
          thread('Sam Ortiz', 'samo', 'More street food'),
        ],
      });
    }),
  );
  return urls;
}

beforeAll(async () => {
  await resetDatabase();
  owner = await signInWithOtp(sampleApp, 'mira@yt.test', 'Mira Lane');
  fan = await signInWithOtp(sampleApp, 'fan@yt.test', 'A Fan');
  mira = await factories.space({
    owner: { id: owner.userId, email: owner.email, name: 'Mira Lane' },
    handle: 'mira',
    displayName: 'Mira Lane',
    communities: [{ name: 'Budget Travel', slug: 'budget-travel' }],
  });
  other = await signInWithOtp(sampleApp, 'other@yt.test', 'Other Owner');
  await factories.space({
    owner: { id: other.userId, email: other.email, name: 'Other Owner' },
    handle: 'otherowner',
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

afterAll(closeDb);

describe('POST /api/studio/followers/import/youtube', () => {
  it('answers labelled sample data without a key and imports it', async () => {
    const res = await post(sampleApp, owner.cookie, {
      channelUrl: 'https://www.youtube.com/@samplechannel',
    }).expect(201);
    expect(res.body.sample).toBe(true);
    expect(res.body.created).toBeGreaterThanOrEqual(5);
    const [row] = await db.select().from(imports).where(eq(imports.id, res.body.importId));
    expect(row?.source).toBe('youtube');
    const listed = await db.select().from(followers).where(eq(followers.spaceId, mira.space.id));
    expect(listed.every((f) => f.platform === 'youtube')).toBe(true);
  });

  it('imports commenters from a handle link and from a channel id link', async () => {
    const urls = stubYoutube();
    const res = await post(keyedApp, owner.cookie, {
      channelUrl: 'https://www.youtube.com/@MiraTravels',
    }).expect(201);
    expect(res.body).toMatchObject({ sample: false, created: 2, duplicates: 0 });
    expect(urls[0]?.searchParams.get('forHandle')).toBe('@miratravels');
    expect(urls[0]?.searchParams.get('key')).toBe('k');

    const [priya] = await db.select().from(followers).where(eq(followers.handle, 'priya.wanders'));
    expect(priya).toMatchObject({
      name: 'Priya Shah',
      platform: 'youtube',
      note: 'Lisbon guide please',
    });

    // Same commenters again: duplicates, nothing new.
    const again = await post(keyedApp, owner.cookie, {
      channelUrl: 'https://www.youtube.com/channel/UCpVm7bg6pXKo1Pr6k5kxG9A',
    }).expect(201);
    expect(urls.at(-3)?.searchParams.get('id')).toBe('UCpVm7bg6pXKo1Pr6k5kxG9A');
    expect(again.body).toMatchObject({ created: 0, duplicates: 2 });
  });

  it('maps a quota error to 502 and an unknown channel to 404', async () => {
    stubYoutube({
      channels: () => json({ error: { errors: [{ reason: 'quotaExceeded' }] } }, 403),
    });
    const quota = await post(keyedApp, other.cookie, {
      channelUrl: 'https://www.youtube.com/@quotatest',
    }).expect(502);
    expect(quota.body.error.message).toMatch(/YouTube/);

    stubYoutube({ channels: () => json({}) });
    await post(keyedApp, other.cookie, {
      channelUrl: 'https://www.youtube.com/@nobodyhere',
    }).expect(404);
  });

  it('rejects links that are not a YouTube channel', async () => {
    await post(keyedApp, owner.cookie, { channelUrl: 'https://example.com/@x1x' }).expect(400);
    await post(keyedApp, owner.cookie, {
      channelUrl: 'https://www.youtube.com/watch?v=abc',
    }).expect(400);
  });

  it('is owner only (a fan has no studio: 404; signed out: 401)', async () => {
    await post(keyedApp, fan.cookie, { channelUrl: 'https://www.youtube.com/@x1x' }).expect(404);
    await request(keyedApp)
      .post('/api/studio/followers/import/youtube')
      .send({ channelUrl: 'https://www.youtube.com/@x1x' })
      .expect(401);
  });

  it(`allows ${YOUTUBE_IMPORTS_PER_DAY.space} live imports per space a day, then 429`, async () => {
    stubYoutube();
    // `other` used 2 of its 3 above (the quota error and the unknown channel).
    await post(keyedApp, other.cookie, { channelUrl: 'https://www.youtube.com/@third' }).expect(
      201,
    );
    const over = await post(keyedApp, other.cookie, {
      channelUrl: 'https://www.youtube.com/@fourth',
    }).expect(429);
    expect(over.body.error.code).toBe('rate_limited');
    // Sample imports (no key) cost no quota and are not capped.
    await post(sampleApp, other.cookie, {
      channelUrl: 'https://www.youtube.com/@samplechannel',
    }).expect(201);
    // Nor are links that are not a channel (a typo costs no quota).
    await post(keyedApp, other.cookie, { channelUrl: 'https://example.com/@x1x' }).expect(400);
  });

  // Last in this describe: it uses up the shared daily cap.
  it(`stops every space after ${YOUTUBE_IMPORTS_PER_DAY.all} live imports a day in all`, async () => {
    stubYoutube();
    for (let i = 0; i < YOUTUBE_IMPORTS_PER_DAY.all; i++) {
      await withinCap({
        name: 'youtube-import-day',
        key: 'all',
        windowSeconds: 86_400,
        max: YOUTUBE_IMPORTS_PER_DAY.all,
        redis: null,
      });
    }
    // A space that has not imported today is stopped too.
    const late = await signInWithOtp(sampleApp, 'late@yt.test', 'Late Owner');
    await factories.space({
      owner: { id: late.userId, email: late.email, name: 'Late Owner' },
      handle: 'lateowner',
    });
    await post(keyedApp, late.cookie, { channelUrl: 'https://www.youtube.com/@late' }).expect(429);
  });
});

describe('auto-tag skips followers the model already saw', () => {
  it('does not resend them until a community changes', async () => {
    await repos.followers.insertMany([
      { spaceId: mira.space.id, name: 'Zed One', note: 'zzz nothing relevant' },
      { spaceId: mira.space.id, name: 'Zed Two', note: 'qqq nothing relevant' },
    ]);
    const auto = () =>
      request(keyedApp)
        .post('/api/studio/followers/auto-tag')
        .set('Cookie', owner.cookie)
        .send({})
        .expect(200);

    tagCalls.length = 0;
    await auto();
    expect(tagCalls.flat()).toEqual(expect.arrayContaining(['Zed One', 'Zed Two']));

    tagCalls.length = 0;
    await auto();
    expect(tagCalls.flat()).not.toContain('Zed One');
    expect(tagCalls.flat()).not.toContain('Zed Two');

    // A new community makes them worth another look.
    await repos.communities.insert({ spaceId: mira.space.id, name: 'Foodies', slug: 'foodies' });
    tagCalls.length = 0;
    await auto();
    expect(tagCalls.flat()).toEqual(expect.arrayContaining(['Zed One', 'Zed Two']));
  });
});
