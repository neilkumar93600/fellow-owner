import type { LookupPlatform } from '@fellow-owners/shared';
import { describe, expect, it, vi } from 'vitest';
import {
  APIFY_ACTORS,
  createPlatformLookup,
  fetchAvatarDataUrl,
  isAllowedAvatarHost,
  mapApifyItems,
  parseProfileUrl,
  simulatedProfile,
} from '../../src/lib/platform-lookup.js';
import instagramSample from '../fixtures/apify/instagram.json' with { type: 'json' };
import tiktokSample from '../fixtures/apify/tiktok.json' with { type: 'json' };
import xSample from '../fixtures/apify/x.json' with { type: 'json' };
import youtubeSample from '../fixtures/apify/youtube.json' with { type: 'json' };

const NOW = new Date('2026-10-09T12:00:00.000Z');
const noSleep = async () => {};

describe('parseProfileUrl', () => {
  it.each([
    ['https://www.instagram.com/natgeo/', 'instagram', 'natgeo'],
    ['https://instagram.com/NatGeo?igsh=abc', 'instagram', 'natgeo'],
    ['instagram.com/mira.lane', 'instagram', 'mira.lane'],
    ['https://www.tiktok.com/@natgeo', 'tiktok', 'natgeo'],
    ['https://m.tiktok.com/@natgeo/video/123', 'tiktok', 'natgeo'],
    ['https://www.youtube.com/@NatGeo', 'youtube', 'natgeo'],
    ['https://m.youtube.com/@natgeo/videos', 'youtube', 'natgeo'],
    ['https://youtube.com/channel/UCpVm7bg6pXKo1Pr6k5kxG9A', 'youtube', 'UCpVm7bg6pXKo1Pr6k5kxG9A'],
    ['https://x.com/NatGeo', 'x', 'NatGeo'],
    ['https://twitter.com/natgeo/', 'x', 'natgeo'],
  ])('%s -> %s/%s', (url, platform, handle) => {
    expect(parseProfileUrl(url)).toEqual({ platform, handle });
  });

  it.each([
    'javascript:alert(1)',
    'javascript://instagram.com/%0aalert(1)',
    'data:text/html,<script>alert(1)</script>',
    'http://instagram.com/natgeo',
    'ftp://instagram.com/natgeo',
    'https://evil.com/natgeo',
    'https://instagram.com.evil.com/natgeo',
    'https://evilinstagram.com/natgeo',
    'https://instagram.com@evil.com/natgeo',
    'https://user:pass@instagram.com/natgeo',
    'https://evil.com@instagram.com/natgeo',
    'https://instagram.com:8443/natgeo',
    'https://127.0.0.1/natgeo',
    'https://[::1]/natgeo',
    'https://169.254.169.254/latest/meta-data',
    'https://2130706433/natgeo',
    'https://xn--nstagram-6qa.com/natgeo',
    'https://іnstagram.com/natgeo',
    'https://instagram.com/p/DdG4RIxIPyf/',
    'https://instagram.com/explore/',
    'https://x.com/home',
    'https://x.com/i/flow/login',
    'https://youtu.be/IT09LD6nQys',
    'https://www.youtube.com/watch?v=IT09LD6nQys',
    'https://tiktok.com/natgeo',
    'https://x.com/a_name_far_too_long_for_x',
    'https://instagram.com/../../etc/passwd',
    '',
    '   ',
    'not a url',
  ])('rejects %s', (url) => {
    expect(parseProfileUrl(url)).toBeNull();
  });
});

describe('mappers (saved actor samples)', () => {
  it('instagram', () => {
    const result = mapApifyItems('instagram', 'natgeo', instagramSample, NOW);
    if (result.status !== 'ready') throw new Error(`expected ready, got ${result.reason}`);
    const p = result.profile;
    expect(p).toMatchObject({
      platform: 'instagram',
      handle: 'natgeo',
      displayName: 'National Geographic',
      verified: true,
      source: 'apify',
      profileUrl: 'https://www.instagram.com/natgeo',
      fetchedAt: NOW.toISOString(),
    });
    expect(p.followers).toBeGreaterThan(1_000_000);
    expect(p.avatarUrl).toMatch(/^https:\/\/[^/]+\.cdninstagram\.com\//);
    expect(p.bio).toContain('National Geographic');
    expect(p.recent.length).toBeGreaterThan(0);
    expect(p.recent.length).toBeLessThanOrEqual(10);
    // Pinned posts are left out, newest first.
    const dates = p.recent.map((post) => post.postedAt ?? '');
    expect([...dates].sort().reverse()).toEqual(dates);
    expect(p.recent[0]?.url).toMatch(/^https:\/\/www\.instagram\.com\/p\//);
  });

  it('instagram private account -> failed private', () => {
    const [first] = instagramSample;
    const result = mapApifyItems('instagram', 'natgeo', [{ ...first, private: true }], NOW);
    expect(result).toEqual({ status: 'failed', reason: 'private' });
  });

  it('tiktok (profile in authorMeta on video items)', () => {
    const result = mapApifyItems('tiktok', 'natgeo', tiktokSample, NOW);
    if (result.status !== 'ready') throw new Error(`expected ready, got ${result.reason}`);
    expect(result.profile).toMatchObject({
      platform: 'tiktok',
      handle: 'natgeo',
      displayName: 'National Geographic',
      verified: true,
      profileUrl: 'https://www.tiktok.com/@natgeo',
    });
    expect(result.profile.followers).toBeGreaterThan(1_000_000);
    expect(result.profile.recent[0]).toMatchObject({
      url: expect.stringMatching(/^https:\/\/www\.tiktok\.com\/@natgeo\/video\//),
      views: expect.any(Number),
      likes: expect.any(Number),
    });
  });

  it('youtube (channel fields on video items, no likes)', () => {
    const result = mapApifyItems('youtube', 'natgeo', youtubeSample, NOW);
    if (result.status !== 'ready') throw new Error(`expected ready, got ${result.reason}`);
    expect(result.profile).toMatchObject({
      platform: 'youtube',
      handle: 'natgeo',
      displayName: 'National Geographic',
      verified: true,
      followers: 26_500_000,
    });
    expect(result.profile.recent).toHaveLength(6);
    expect(result.profile.recent.every((post) => post.likes === null)).toBe(true);
    // "2h ago" becomes a timestamp relative to the fetch.
    expect(result.profile.recent[0]?.postedAt).toBe('2026-10-09T10:00:00.000Z');
  });

  it('x picks the requested handle out of padded / related users', () => {
    const result = mapApifyItems('x', 'natgeo', xSample, NOW);
    if (result.status !== 'ready') throw new Error(`expected ready, got ${result.reason}`);
    expect(result.profile).toMatchObject({
      platform: 'x',
      handle: 'NatGeo',
      displayName: 'National Geographic',
      followers: 28_086_382,
      verified: true,
      recent: [],
    });
    // The 48px "_normal" avatar is swapped for the 400px one.
    expect(result.profile.avatarUrl).toMatch(/^https:\/\/pbs\.twimg\.com\/.+_400x400\.jpg$/);
  });

  it.each([
    ['empty dataset', []],
    ['not an array', { error: 'nope' }],
    ['error item', [{ url: 'x', error: 'Profile not found', errorCode: 'not_found' }]],
  ])('%s -> failed', (_label, items) => {
    for (const platform of ['instagram', 'tiktok', 'youtube', 'x'] as LookupPlatform[]) {
      expect(mapApifyItems(platform, 'natgeo', items, NOW).status).toBe('failed');
    }
  });

  it('x without the requested handle -> failed not_found', () => {
    expect(mapApifyItems('x', 'someoneelse', xSample, NOW)).toEqual({
      status: 'failed',
      reason: 'not_found',
    });
  });
});

function okResponse(items: unknown): Response {
  return new Response(JSON.stringify(items), {
    status: 201,
    headers: { 'content-type': 'application/json' },
  });
}

describe('createPlatformLookup', () => {
  it('demo handles answer from fixtures without a network call', async () => {
    const fetch = vi.fn();
    const lookup = createPlatformLookup({ token: 't', enabled: true, fetch, sleep: noSleep });
    const result = await lookup.lookup({ platform: 'youtube', handle: 'miralane' });
    expect(result).toMatchObject({
      status: 'ready',
      profile: { source: 'fixture', followers: 620_000 },
    });
    const ig = await lookup.lookup({ platform: 'instagram', handle: 'mira' });
    expect(ig).toMatchObject({ profile: { followers: 380_000 } });
    const tt = await lookup.lookup({ platform: 'tiktok', handle: 'priya' });
    expect(tt).toMatchObject({ profile: { followers: 140_000 } });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('no token -> deterministic simulated profile', async () => {
    const fetch = vi.fn();
    const lookup = createPlatformLookup({
      enabled: false,
      fetch,
      sleep: noSleep,
      now: () => NOW,
    });
    const a = await lookup.lookup({ platform: 'instagram', handle: 'someone' });
    const b = await lookup.lookup({ platform: 'instagram', handle: 'someone' });
    expect(a).toMatchObject({ status: 'ready', profile: { source: 'simulated' } });
    if (a.status !== 'ready' || b.status !== 'ready') throw new Error('expected ready');
    expect({ ...a.profile, fetchedAt: '' }).toEqual({ ...b.profile, fetchedAt: '' });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('calls run-sync with the actor, a bearer token, caps and no raw URL', async () => {
    const fetch = vi.fn(async () => okResponse(youtubeSample));
    const lookup = createPlatformLookup({ token: 'secret-token', enabled: true, fetch });
    const result = await lookup.lookup({ platform: 'youtube', handle: 'natgeo' });
    expect(result.status).toBe('ready');
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain(`/v2/acts/${APIFY_ACTORS.youtube}/run-sync-get-dataset-items?`);
    expect(url).toContain('timeout=45');
    expect(url).toContain('maxTotalChargeUsd=0.05');
    expect(url).not.toContain('secret-token');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer secret-token');
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(JSON.parse(String(init.body))).toMatchObject({
      startUrls: [{ url: 'https://www.youtube.com/@natgeo' }],
    });
  });

  it('x pads to the actor minimum of 5 handles', async () => {
    const fetch = vi.fn(async () => okResponse(xSample));
    const lookup = createPlatformLookup({ token: 't', enabled: true, fetch });
    await lookup.lookup({ platform: 'x', handle: 'NatGeo' });
    const [, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    const body = JSON.parse(String(init.body));
    expect(body.twitterHandles).toEqual(['NatGeo', 'NatGeo', 'NatGeo', 'NatGeo', 'NatGeo']);
  });

  it('a timeout returns failed, never throws', async () => {
    const fetch = vi.fn(
      (_url: string | URL | Request, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(init.signal?.reason));
        }),
    );
    const lookup = createPlatformLookup({ token: 't', enabled: true, fetch, timeoutMs: 20 });
    await expect(lookup.lookup({ platform: 'instagram', handle: 'natgeo' })).resolves.toEqual({
      status: 'failed',
      reason: 'unavailable',
    });
  });

  it('quota exhausted (402) and server errors return failed', async () => {
    const fetch = vi.fn(
      async () => new Response('{"error":{"type":"not-enough-usage"}}', { status: 402 }),
    );
    const lookup = createPlatformLookup({ token: 't', enabled: true, fetch });
    await expect(lookup.lookup({ platform: 'tiktok', handle: 'natgeo' })).resolves.toEqual({
      status: 'failed',
      reason: 'unavailable',
    });
  });

  it('x failure, quota or empty dataset falls back to labelled sample data', async () => {
    for (const fetch of [
      vi.fn(async () => new Response('{}', { status: 402 })),
      vi.fn(async () => okResponse([])),
      vi.fn(async () => {
        throw new TypeError('fetch failed');
      }),
    ]) {
      const lookup = createPlatformLookup({ token: 't', enabled: true, fetch });
      const result = await lookup.lookup({ platform: 'x', handle: 'natgeo' });
      expect(result).toMatchObject({
        status: 'ready',
        profile: { platform: 'x', handle: 'natgeo', source: 'simulated' },
      });
    }
  });

  it('simulatedProfile is labelled and capped', () => {
    const p = simulatedProfile('tiktok', 'abc', NOW);
    expect(p.source).toBe('simulated');
    expect(p.recent.length).toBeLessThanOrEqual(10);
    expect(p.profileUrl).toBe('https://www.tiktok.com/@abc');
  });
});

describe('avatar fetch', () => {
  it.each([
    ['https://scontent-lhr6-2.cdninstagram.com/v/a.jpg', true],
    ['https://scontent.xx.fbcdn.net/a.jpg', true],
    ['https://p16-common-sign.tiktokcdn-us.com/a.jpeg', true],
    ['https://p77-sign-va.tiktokcdn.com/a.jpeg', true],
    ['https://yt3.ggpht.com/a', true],
    ['https://yt3.googleusercontent.com/a=s68', true],
    ['https://i.ytimg.com/vi/a.jpg', true],
    ['https://pbs.twimg.com/profile_images/a_400x400.jpg', true],
    ['http://pbs.twimg.com/a.jpg', false],
    ['https://evil.com/a.jpg', false],
    ['https://cdninstagram.com.evil.com/a.jpg', false],
    ['https://lh3.googleusercontent.com/a', false],
    ['https://169.254.169.254/latest', false],
    ['https://user@pbs.twimg.com/a.jpg', false],
    ['/demo/mira.jpg', false],
  ])('%s allowed=%s', (url, allowed) => {
    expect(isAllowedAvatarHost(url)).toBe(allowed);
  });

  const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

  it('returns a data URL for a small image from an allowed host', async () => {
    const fetch = vi.fn(
      async () => new Response(png, { status: 200, headers: { 'content-type': 'image/png' } }),
    );
    const url = await fetchAvatarDataUrl('https://pbs.twimg.com/a.png', fetch);
    expect(url).toBe(`data:image/png;base64,${Buffer.from(png).toString('base64')}`);
    expect((fetch.mock.calls[0] as unknown as [string, RequestInit])[1].redirect).toBe('error');
  });

  it('refuses foreign hosts without fetching, non-images, svg and anything over 256KB', async () => {
    const fetch = vi.fn(
      async () => new Response(png, { status: 200, headers: { 'content-type': 'image/png' } }),
    );
    expect(await fetchAvatarDataUrl('https://evil.com/a.png', fetch)).toBeNull();
    expect(fetch).not.toHaveBeenCalled();

    const html = vi.fn(
      async () => new Response('<html>', { status: 200, headers: { 'content-type': 'text/html' } }),
    );
    expect(await fetchAvatarDataUrl('https://pbs.twimg.com/a.png', html)).toBeNull();

    const svg = vi.fn(
      async () =>
        new Response('<svg/>', { status: 200, headers: { 'content-type': 'image/svg+xml' } }),
    );
    expect(await fetchAvatarDataUrl('https://pbs.twimg.com/a.svg', svg)).toBeNull();

    const big = vi.fn(
      async () =>
        new Response(new Uint8Array(256 * 1024 + 1), {
          status: 200,
          headers: { 'content-type': 'image/jpeg' },
        }),
    );
    expect(await fetchAvatarDataUrl('https://pbs.twimg.com/a.jpg', big)).toBeNull();
  });
});
