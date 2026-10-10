import {
  createSpaceSchema,
  type PlatformEntry,
  type PlatformLookupResult,
  spaceProfileSchema,
} from '@fellow-owners/shared';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { buildContainer } from '../../src/container.js';
import { createApp } from '../../src/create-app.js';
import { user } from '../../src/db/schema/auth.js';
import type { PlatformLookup, ProfileTarget } from '../../src/lib/platform-lookup.js';
import { REFRESH_MAX_PER_RUN, refreshFollowers } from '../../src/workers/refresh-followers.js';
import { signInWithOtp } from '../helpers/auth.js';
import { createFactories } from '../helpers/factories.js';
import { closeDb, db, resetDatabase } from '../helpers/test-db.js';

const container = buildContainer();
const app = createApp(container);
const factories = createFactories(container);
const { repos, env } = container;

afterAll(async () => {
  await closeDb();
});

/** A resolver that answers from a map keyed by handle and records every call. */
function fakeLookup(answers: Record<string, PlatformLookupResult>) {
  const calls: Array<{ target: ProfileTarget; recent: boolean | undefined }> = [];
  const lookup = {
    async lookup(target: ProfileTarget, options?: { recent?: boolean }) {
      calls.push({ target, recent: options?.recent });
      return answers[target.handle] ?? { status: 'failed', reason: 'unavailable' };
    },
  } as unknown as PlatformLookup;
  return { lookup, calls };
}

const ready = (handle: string, followers: number, source = 'apify'): PlatformLookupResult =>
  ({
    status: 'ready',
    profile: { platform: 'instagram', handle, followers, source },
  }) as PlatformLookupResult;

const entry = (handle: string, followers: number, fetchedAt?: string): PlatformEntry => ({
  platform: 'instagram',
  url: `https://www.instagram.com/${handle}`,
  followers,
  handle,
  ...(fetchedAt ? { fetchedAt } : {}),
});

async function platformsOf(handle: string): Promise<PlatformEntry[]> {
  return (await repos.spaces.findByHandle(handle))?.platforms ?? [];
}

describe('refreshFollowers', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('updates fresh counts, keeps old ones on failure and on samples, skips the demo', async () => {
    const a = await factories.space({ handle: 'aa_space' });
    const b = await factories.space({ handle: 'bb_space' });
    const demo = await factories.space({ handle: 'demo_space', isDemo: true });
    const old = '2026-01-01T00:00:00.000Z';
    await repos.spaces.update(a.space.id, {
      platforms: [entry('fresh_one', 100, old), entry('gone_one', 200, old)],
    });
    await repos.spaces.update(b.space.id, { platforms: [entry('sample_one', 300, old)] });
    await repos.spaces.update(demo.space.id, { platforms: [entry('demo_one', 400, old)] });

    const { lookup, calls } = fakeLookup({
      fresh_one: ready('fresh_one', 150),
      sample_one: ready('sample_one', 999, 'simulated'),
    });
    const result = await refreshFollowers({ db, env, logger: container.logger, lookup });

    expect(result).toEqual({ checked: 3, updated: 1, kept: 2 });
    expect(calls.every((c) => c.recent === false)).toBe(true);
    expect(calls.map((c) => c.target.handle)).not.toContain('demo_one');

    const [fresh, gone] = await platformsOf('aa_space');
    expect(fresh).toMatchObject({ followers: 150 });
    expect(gone).toMatchObject({ followers: 200 });
    const sample = (await platformsOf('bb_space'))[0];
    expect(sample).toMatchObject({ followers: 300 });
    // every attempt moves to the back of the queue; the demo is untouched
    for (const e of [fresh, gone, sample]) {
      expect(e?.fetchedAt && e.fetchedAt > old).toBe(true);
    }
    expect((await platformsOf('demo_space'))[0]).toMatchObject({ followers: 400, fetchedAt: old });
  });

  it('refreshes oldest first, never-fetched first, at most 50 per run', async () => {
    const s = await factories.space({ handle: 'many_space' });
    const entries = Array.from({ length: REFRESH_MAX_PER_RUN + 5 }, (_, i) =>
      // i = 0..4 have never been fetched; the rest have rising timestamps
      entry(
        `h${String(i).padStart(2, '0')}`,
        1,
        i < 5 ? undefined : `2026-02-01T00:${String(i).padStart(2, '0')}:00.000Z`,
      ),
    );
    await repos.spaces.update(s.space.id, { platforms: entries });
    const { lookup, calls } = fakeLookup({});
    const result = await refreshFollowers({ db, env, logger: container.logger, lookup });
    expect(result.checked).toBe(REFRESH_MAX_PER_RUN);
    const handles = calls.map((c) => c.target.handle);
    for (const h of ['h00', 'h01', 'h02', 'h03', 'h04']) expect(handles).toContain(h);
    // the newest five are the ones left for tomorrow
    for (const h of ['h50', 'h51', 'h52', 'h53', 'h54']) expect(handles).not.toContain(h);
  });
});

describe('/api/cron/refresh-followers', () => {
  it('needs the cron secret', async () => {
    await request(app).post('/api/cron/refresh-followers').expect(401);
    await request(app)
      .get('/api/cron/refresh-followers')
      .set('Authorization', 'Bearer nope')
      .expect(401);
  });

  it('runs with the secret', async () => {
    await resetDatabase();
    const res = await request(app)
      .get('/api/cron/refresh-followers')
      .set('Authorization', `Bearer ${env.CRON_SECRET}`)
      .expect(200);
    expect(res.body).toEqual({ ok: true, checked: 0, updated: 0, kept: 0 });
  });
});

describe('avatarUrl validation', () => {
  const profile = (avatarUrl: unknown) =>
    spaceProfileSchema.safeParse({ displayName: 'Mira', platforms: [], avatarUrl }).success;
  const png = `data:image/png;base64,${'A'.repeat(100)}`;

  it('accepts http(s), site paths and small base64 images', () => {
    expect(profile('https://cdn.example.com/a.jpg')).toBe(true);
    expect(profile('/demo/mira.jpg')).toBe(true);
    expect(profile(png)).toBe(true);
    expect(profile(null)).toBe(true);
  });

  it('rejects everything else', () => {
    expect(profile('javascript:alert(1)')).toBe(false);
    expect(profile('//evil.com/a.jpg')).toBe(false);
    expect(profile('/../etc/passwd')).toBe(false);
    expect(profile('data:image/svg+xml;base64,AAAA')).toBe(false);
    expect(profile('data:text/html;base64,AAAA')).toBe(false);
    expect(profile(`data:image/png;base64,${'A'.repeat(350_001)}`)).toBe(false);
    expect(profile(`data:image/png;base64,${'A'.repeat(300_000)}`)).toBe(true);
  });

  it('createSpaceSchema takes avatarUrl and platform handle/fetchedAt', () => {
    const parsed = createSpaceSchema.safeParse({
      handle: 'nina',
      displayName: 'Nina',
      avatarUrl: png,
      platforms: [entry('nina', 5, '2026-03-01T00:00:00.000Z')],
      communities: [{ name: 'Travel', tint: 'lime', icon: 'globe' }],
      tasteProfile: { promote: ['x'], never: [], voice: [] },
    });
    expect(parsed.success).toBe(true);
  });
});

describe('onboarding with an imported profile', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  const body = (extra: object) => ({
    displayName: 'Imp',
    platforms: [],
    communities: [{ name: 'Travel', tint: 'lime', icon: 'globe' }],
    tasteProfile: { promote: ['x'], never: [], voice: [] },
    ...extra,
  });

  it('stores avatarUrl, bio, handle and fetchedAt on create', async () => {
    const who = await signInWithOtp(app, 'imp@refresh.test', 'Imp');
    const avatarUrl = `data:image/jpeg;base64,${'B'.repeat(200)}`;
    const platform = entry('imp', 42, '2026-03-01T00:00:00.000Z');
    await request(app)
      .post('/api/studio/space')
      .set('Cookie', who.cookie)
      .send(body({ handle: 'imp', bio: 'Slow travel', avatarUrl, platforms: [platform] }))
      .expect(201);
    const space = await repos.spaces.findByHandle('imp');
    expect(space).toMatchObject({ avatarUrl, bio: 'Slow travel' });
    expect(space?.platforms).toEqual([platform]);
  });

  it('rejects a script avatar on create', async () => {
    const who = await signInWithOtp(app, 'bad@refresh.test', 'Bad');
    await request(app)
      .post('/api/studio/space')
      .set('Cookie', who.cookie)
      .send(body({ handle: 'badone', avatarUrl: 'javascript:alert(1)' }))
      .expect(400);
  });

  it('handle-check counts the caller own username as free, but not another user', async () => {
    const me = await signInWithOtp(app, 'me@refresh.test', 'Me');
    const other = await signInWithOtp(app, 'other@refresh.test', 'Other');
    await db.update(user).set({ username: 'mine_one' }).where(eq(user.id, me.userId));
    await db.update(user).set({ username: 'theirs_one' }).where(eq(user.id, other.userId));
    const check = (handle: string) =>
      request(app).get(`/api/studio/handle-check?handle=${handle}`).set('Cookie', me.cookie);
    expect((await check('mine_one').expect(200)).body).toMatchObject({ available: true });
    expect((await check('theirs_one').expect(200)).body).toMatchObject({
      available: false,
      reason: 'taken',
    });
  });
});
