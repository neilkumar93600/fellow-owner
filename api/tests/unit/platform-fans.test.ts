import { PLATFORM_FANS_LIMITS } from '@fellow-owners/shared';
import { describe, expect, it, vi } from 'vitest';
import {
  COMMENT_ACTORS,
  createPlatformFans,
  demoFans,
  mapCommenters,
} from '../../src/lib/platform-fans.js';
import instagramProfile from '../fixtures/apify/instagram.json' with { type: 'json' };
import instagramComments from '../fixtures/apify/instagram-comments.json' with { type: 'json' };
import tiktokProfile from '../fixtures/apify/tiktok.json' with { type: 'json' };
import tiktokComments from '../fixtures/apify/tiktok-comments.json' with { type: 'json' };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

/** Answers the profile scraper with `profile` and the comment scraper with `comments`. */
function apify(profile: () => Response, comments: () => Response) {
  const calls: Array<{ url: URL; body: Record<string, unknown> }> = [];
  const impl = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input));
    calls.push({ url, body: JSON.parse(String(init?.body ?? '{}')) });
    return /comment/.test(url.pathname) ? comments() : profile();
  });
  return { impl: impl as unknown as typeof fetch, calls };
}

const live = { apifyToken: 't', apifyEnabled: true, youtubeKey: undefined };

describe('mapCommenters (saved actor samples)', () => {
  it('instagram: one person per handle, notes joined, creator and error items dropped', () => {
    const people = mapCommenters('instagram', instagramComments, 'natgeo');
    expect(people).toEqual([
      {
        name: 'lena.roams',
        handle: 'lena.roams',
        note: 'Saving this for my Lisbon trip in May! | Where was the tile cafe?',
      },
      {
        name: 'Theo Grant',
        handle: 'theo.packslight',
        note: 'How do you fit two weeks into one carry-on?',
      },
      { name: 'aiko.eats', handle: 'aiko.eats', note: '🔥🔥' },
    ]);
  });

  it('tiktok: uniqueId is the handle, case-insensitive dedupe', () => {
    const people = mapCommenters('tiktok', tiktokComments, 'natgeo');
    expect(people.map((p) => p.handle)).toEqual(['jules.wanders', 'sam.flights']);
    expect(people[0]?.note).toBe('the hostel tour was so helpful omg | part 2 please');
  });

  it(`keeps at most ${PLATFORM_FANS_LIMITS.peopleMax} people and drops handles a follower cannot store`, () => {
    const many = Array.from({ length: 250 }, (_, i) => ({ uniqueId: `fan${i}`, text: 'hi' }));
    expect(mapCommenters('tiktok', many)).toHaveLength(PLATFORM_FANS_LIMITS.peopleMax);
    const bad = [{ uniqueId: 'has space' }, { uniqueId: 'x'.repeat(61) }, { uniqueId: '' }, {}];
    expect(mapCommenters('tiktok', bad)).toEqual([]);
    expect(mapCommenters('instagram', { not: 'an array' })).toEqual([]);
  });
});

describe('createPlatformFans', () => {
  it('is live only with a provider; X never', () => {
    const off = createPlatformFans({ apifyToken: undefined, apifyEnabled: false, youtubeKey: 'k' });
    expect(off.live('instagram')).toBe(false);
    expect(off.live('youtube')).toBe(true);
    const on = createPlatformFans(live);
    expect([on.live('instagram'), on.live('tiktok'), on.live('youtube'), on.live('x')]).toEqual([
      true,
      true,
      false,
      false,
    ]);
  });

  it('instagram: recent post URLs from the lookup, then one capped comment run', async () => {
    const { impl, calls } = apify(
      () => json(instagramProfile),
      () => json(instagramComments),
    );
    const fans = createPlatformFans({ ...live, fetch: impl });
    const result = await fans.commenters({ platform: 'instagram', handle: 'natgeo' });
    expect(result).toMatchObject({ status: 'ok', commenters: expect.any(Array) });
    if (result.status !== 'ok') throw new Error('expected ok');
    expect(result.commenters.map((c) => c.handle)).toEqual([
      'lena.roams',
      'theo.packslight',
      'aiko.eats',
    ]);

    const run = calls[1];
    expect(run?.url.pathname).toBe(
      `/v2/acts/${COMMENT_ACTORS.instagram}/run-sync-get-dataset-items`,
    );
    expect(run?.url.searchParams.get('maxTotalChargeUsd')).toBe('0.50');
    const urls = run?.body.directUrls as string[];
    expect(urls.length).toBeGreaterThan(0);
    expect(urls.length).toBeLessThanOrEqual(PLATFORM_FANS_LIMITS.postsMax);
    expect(result.posts).toBe(urls.length);
    expect(urls.every((u) => u.startsWith('https://www.instagram.com/p/'))).toBe(true);
    expect(run?.body).toMatchObject({ resultsLimit: PLATFORM_FANS_LIMITS.commentsPerPost });
  });

  it('tiktok: postURLs and commentsPerPost, no replies', async () => {
    const { impl, calls } = apify(
      () => json(tiktokProfile),
      () => json(tiktokComments),
    );
    const fans = createPlatformFans({ ...live, fetch: impl });
    const result = await fans.commenters({ platform: 'tiktok', handle: 'natgeo' });
    expect(result).toMatchObject({ status: 'ok', posts: 5 });
    expect(calls[1]?.url.pathname).toContain(COMMENT_ACTORS.tiktok);
    expect(calls[1]?.body).toMatchObject({
      commentsPerPost: PLATFORM_FANS_LIMITS.commentsPerPost,
      maxRepliesPerComment: 0,
    });
    expect(calls[1]?.body.postURLs).toHaveLength(5);
  });

  it('maps lookup failures and a refused comment run', async () => {
    const [first] = instagramProfile;
    const privateFans = createPlatformFans({
      ...live,
      fetch: apify(
        () => json([{ ...first, private: true }]),
        () => json([]),
      ).impl,
    });
    expect(await privateFans.commenters({ platform: 'instagram', handle: 'natgeo' })).toEqual({
      status: 'skipped',
      reason: 'private',
    });

    const refused = createPlatformFans({
      ...live,
      fetch: apify(
        () => json(instagramProfile),
        () => json({ error: 'quota' }, 402),
      ).impl,
    });
    expect(await refused.commenters({ platform: 'instagram', handle: 'natgeo' })).toEqual({
      status: 'skipped',
      reason: 'unavailable',
    });
  });

  it('youtube without a key answers sample (never written)', async () => {
    const fans = createPlatformFans({ ...live, youtubeKey: undefined });
    expect(await fans.commenters({ platform: 'youtube', handle: 'somebody' })).toEqual({
      status: 'skipped',
      reason: 'sample',
    });
  });

  it('demo fixtures exist for every fetched platform', () => {
    for (const platform of ['instagram', 'tiktok', 'youtube'] as const) {
      const fixture = demoFans(platform);
      if (fixture.status !== 'ok') throw new Error('expected ok');
      expect(fixture.commenters.length).toBeGreaterThan(0);
    }
  });
});
