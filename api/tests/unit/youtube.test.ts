import { describe, expect, it, vi } from 'vitest';
import {
  createYoutubeClient,
  parseChannelUrl,
  sampleCommenters,
  YoutubeError,
} from '../../src/lib/youtube.js';

const ID = 'UCpVm7bg6pXKo1Pr6k5kxG9A';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const thread = (author: string, url: string, text: string) => ({
  snippet: {
    topLevelComment: {
      snippet: { authorDisplayName: author, authorChannelUrl: url, textDisplay: text },
    },
  },
});

/** Routes by endpoint name; records every URL. */
function mockFetch(routes: Record<string, (url: URL) => Response>) {
  const calls: URL[] = [];
  const impl = vi.fn(async (input: string | URL | Request) => {
    const url = new URL(String(input));
    calls.push(url);
    const name = url.pathname.split('/').pop() ?? '';
    const route = routes[name];
    if (!route) throw new Error(`unexpected ${url}`);
    return route(url);
  });
  return { impl: impl as unknown as typeof fetch, calls };
}

const channels = (url: URL) => {
  expect(url.searchParams.get('key')).toBe('k');
  return json({ items: [{ contentDetails: { relatedPlaylists: { uploads: 'UU1' } } }] });
};
const playlist = () =>
  json({ items: [{ contentDetails: { videoId: 'v1' } }, { contentDetails: { videoId: 'v2' } }] });

describe('parseChannelUrl', () => {
  it('reads a handle link', () => {
    expect(parseChannelUrl('https://www.youtube.com/@MiraLane')).toEqual({ handle: '@miralane' });
  });
  it('reads a channel id link', () => {
    expect(parseChannelUrl(`https://youtube.com/channel/${ID}`)).toEqual({ id: ID });
  });
  it.each([
    'https://www.youtube.com/watch?v=abc',
    'https://instagram.com/natgeo',
    'http://youtube.com/@x1x',
    'javascript:alert(1)',
  ])('refuses %s', (raw) => {
    expect(parseChannelUrl(raw)).toBeNull();
  });
});

describe('createYoutubeClient', () => {
  it('resolves a handle, walks the latest uploads and groups comments by commenter', async () => {
    const { impl, calls } = mockFetch({
      channels: (url) => {
        expect(url.searchParams.get('forHandle')).toBe('@miralane');
        return channels(url);
      },
      playlistItems: (url) => {
        expect(url.searchParams.get('playlistId')).toBe('UU1');
        expect(url.searchParams.get('maxResults')).toBe('2');
        return playlist();
      },
      commentThreads: (url) =>
        json({
          items:
            url.searchParams.get('videoId') === 'v1'
              ? [
                  thread(
                    'Priya Shah',
                    'http://www.youtube.com/@priya.wanders',
                    'Lisbon guide please',
                  ),
                  thread('Sam', `http://www.youtube.com/channel/${ID}`, 'More street food'),
                ]
              : [
                  thread(
                    'Priya Shah',
                    'http://www.youtube.com/@priya.wanders',
                    'Also a packing list',
                  ),
                ],
        }),
    });
    const client = createYoutubeClient({ apiKey: 'k', fetch: impl });
    const result = await client.commenters(
      { handle: '@miralane' },
      { maxVideos: 2, maxComments: 100 },
    );
    expect(result.source).toBe('youtube');
    expect(result.commenters).toEqual([
      {
        name: 'Priya Shah',
        handle: 'priya.wanders',
        note: 'Lisbon guide please | Also a packing list',
      },
      { name: 'Sam', handle: ID, note: 'More street food' },
    ]);
    expect(calls.map((c) => c.pathname.split('/').pop())).toEqual([
      'channels',
      'playlistItems',
      'commentThreads',
      'commentThreads',
    ]);
  });

  it('resolves a channel id and stops at maxComments', async () => {
    const { impl } = mockFetch({
      channels: (url) => {
        expect(url.searchParams.get('id')).toBe(ID);
        return channels(url);
      },
      playlistItems: playlist,
      commentThreads: () =>
        json({
          items: [
            thread('A', 'http://www.youtube.com/@aaa', 'one'),
            thread('B', 'http://www.youtube.com/@bbb', 'two'),
            thread('C', 'http://www.youtube.com/@ccc', 'three'),
          ],
        }),
    });
    const result = await createYoutubeClient({ apiKey: 'k', fetch: impl }).commenters(
      { id: ID },
      { maxVideos: 2, maxComments: 2 },
    );
    expect(result.commenters.map((c) => c.handle)).toEqual(['aaa', 'bbb']);
  });

  it('skips a video with comments turned off', async () => {
    const { impl } = mockFetch({
      channels,
      playlistItems: playlist,
      commentThreads: (url) =>
        url.searchParams.get('videoId') === 'v1'
          ? json({ error: { errors: [{ reason: 'commentsDisabled' }] } }, 403)
          : json({ items: [thread('B', 'http://www.youtube.com/@bbb', 'hi')] }),
    });
    const result = await createYoutubeClient({ apiKey: 'k', fetch: impl }).commenters(
      { id: ID },
      { maxVideos: 2, maxComments: 10 },
    );
    expect(result.commenters).toHaveLength(1);
  });

  it('maps a quota error to YoutubeError(quota)', async () => {
    const { impl } = mockFetch({
      channels: () => json({ error: { errors: [{ reason: 'quotaExceeded' }] } }, 403),
    });
    await expect(
      createYoutubeClient({ apiKey: 'k', fetch: impl }).commenters(
        { id: ID },
        { maxVideos: 2, maxComments: 10 },
      ),
    ).rejects.toMatchObject({ name: 'YoutubeError', reason: 'quota' });
  });

  it('maps an unknown channel to not_found and a server error to unavailable', async () => {
    const empty = mockFetch({ channels: () => json({}) });
    await expect(
      createYoutubeClient({ apiKey: 'k', fetch: empty.impl }).commenters(
        { id: ID },
        { maxVideos: 2, maxComments: 10 },
      ),
    ).rejects.toMatchObject({ reason: 'not_found' });
    const down = mockFetch({ channels: () => json({}, 500) });
    const error = await createYoutubeClient({ apiKey: 'k', fetch: down.impl })
      .commenters({ id: ID }, { maxVideos: 2, maxComments: 10 })
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(YoutubeError);
    expect(error).toMatchObject({ reason: 'unavailable' });
  });

  it('without a key answers labelled sample data and never calls the network', async () => {
    const { impl, calls } = mockFetch({});
    const result = await createYoutubeClient({ apiKey: undefined, fetch: impl }).commenters(
      { handle: '@miralane' },
      { maxVideos: 2, maxComments: 100 },
    );
    expect(result.source).toBe('sample');
    expect(result.commenters.length).toBeGreaterThanOrEqual(5);
    expect(result.commenters).toEqual(sampleCommenters('@miralane'));
    expect(calls).toHaveLength(0);
  });
});
