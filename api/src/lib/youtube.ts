import { LIMITS } from '@fellow-owners/shared';
import { parseProfileUrl } from './platform-lookup.js';

/**
 * YouTube comment import (F15): a channel link -> people who commented on its latest videos.
 * Data API v3: channels.list (forHandle / id) -> uploads playlist -> latest videos ->
 * commentThreads.list. Without YOUTUBE_API_KEY the client answers labelled sample data
 * (`source: 'sample'`), like lib/platform-lookup.ts does for profiles.
 */

export type ChannelRef = { handle: string } | { id: string };

export interface YoutubeCommenter {
  name: string;
  /** Without the @; a channel id when the commenter has no handle. */
  handle: string;
  /** Their comments on the sampled videos, joined and cut to the follower note limit. */
  note: string;
}

export interface YoutubeComments {
  source: 'youtube' | 'sample';
  commenters: YoutubeCommenter[];
}

export type YoutubeFailure = 'not_found' | 'quota' | 'unavailable';

export class YoutubeError extends Error {
  readonly reason: YoutubeFailure;
  constructor(reason: YoutubeFailure) {
    super(`youtube: ${reason}`);
    this.name = 'YoutubeError';
    this.reason = reason;
  }
}

/** `{handle: '@name'}` or `{id}` from a pasted channel link; null for anything else. */
export function parseChannelUrl(raw: string): ChannelRef | null {
  const target = parseProfileUrl(raw);
  if (target?.platform !== 'youtube') return null;
  return target.handle.startsWith('UC') && target.handle.length === 24
    ? { id: target.handle }
    : { handle: `@${target.handle}` };
}

const API = 'https://www.googleapis.com/youtube/v3';
const NOTE_JOIN = ' | ';
const QUOTA_REASONS = /quotaExceeded|dailyLimitExceeded|rateLimitExceeded|userRateLimitExceeded/;

/** Untrusted API payload: every read below is optional-chained and type-checked. */
// ponytail: loose on purpose, the API shapes are read defensively instead of modelled.
// biome-ignore lint/suspicious/noExplicitAny: untrusted payload
type Json = any;

export interface YoutubeDeps {
  apiKey: string | undefined;
  fetch?: typeof fetch;
  timeoutMs?: number;
}

/** A commenter's handle from snippet.authorChannelUrl (".../@name" or ".../channel/UC..."). */
function handleOf(channelUrl: unknown): string | null {
  if (typeof channelUrl !== 'string') return null;
  const match = channelUrl.match(/\/(?:@([\w.-]{1,60})|channel\/(UC[\w-]{22}))\/?$/);
  return match?.[1] ?? match?.[2] ?? null;
}

export function createYoutubeClient(deps: YoutubeDeps) {
  const timeoutMs = deps.timeoutMs ?? 15_000;

  async function get(
    doFetch: typeof fetch,
    path: string,
    params: Record<string, string>,
  ): Promise<{ status: number; body: Json }> {
    const url = `${API}/${path}?${new URLSearchParams({ ...params, key: deps.apiKey ?? '' })}`;
    try {
      const res = await doFetch(url, { signal: AbortSignal.timeout(timeoutMs) });
      const body = (await res.json().catch(() => ({}))) as Json;
      return { status: res.status, body };
    } catch {
      throw new YoutubeError('unavailable');
    }
  }

  const reasonOf = (body: Json): string =>
    (body.error?.errors ?? []).map((e: Json) => String(e.reason)).join(',');

  /** Throws the mapped failure for a non-200; the caller handles any status it expects. */
  function fail(status: number, body: Json): never {
    if (status === 403 && QUOTA_REASONS.test(reasonOf(body))) throw new YoutubeError('quota');
    throw new YoutubeError(status === 404 ? 'not_found' : 'unavailable');
  }

  return {
    async commenters(
      channel: ChannelRef,
      limits: { maxVideos: number; maxComments: number },
    ): Promise<YoutubeComments> {
      if (!deps.apiKey) {
        const handle = 'handle' in channel ? channel.handle : channel.id;
        return { source: 'sample', commenters: sampleCommenters(handle) };
      }
      const doFetch = deps.fetch ?? fetch;

      const found = await get(doFetch, 'channels', {
        part: 'contentDetails',
        ...('handle' in channel ? { forHandle: channel.handle } : { id: channel.id }),
      });
      if (found.status !== 200) fail(found.status, found.body);
      const uploads = found.body.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
      if (typeof uploads !== 'string') throw new YoutubeError('not_found');

      const videos = await get(doFetch, 'playlistItems', {
        part: 'contentDetails',
        playlistId: uploads,
        maxResults: String(limits.maxVideos),
      });
      if (videos.status !== 200) fail(videos.status, videos.body);
      const videoIds: string[] = (videos.body.items ?? [])
        .map((item: Json) => item.contentDetails?.videoId)
        .filter((id: unknown): id is string => typeof id === 'string')
        .slice(0, limits.maxVideos);

      const byHandle = new Map<string, YoutubeCommenter>();
      let seen = 0;
      for (const videoId of videoIds) {
        if (seen >= limits.maxComments) break;
        // ponytail: first page only (100 threads per video); page through if videos run dry.
        const threads = await get(doFetch, 'commentThreads', {
          part: 'snippet',
          videoId,
          maxResults: String(Math.min(100, limits.maxComments - seen)),
          order: 'relevance',
          textFormat: 'plainText',
        });
        // Comments turned off on one video must not fail the whole import.
        if (threads.status === 403 && /commentsDisabled/.test(reasonOf(threads.body))) continue;
        if (threads.status !== 200) fail(threads.status, threads.body);
        for (const item of threads.body.items ?? []) {
          if (seen >= limits.maxComments) break;
          const snippet = item.snippet?.topLevelComment?.snippet ?? {};
          const text = String(snippet.textDisplay ?? '').trim();
          const handle = handleOf(snippet.authorChannelUrl);
          if (!text || !handle) continue;
          seen += 1;
          const name = String(snippet.authorDisplayName ?? '')
            .replace(/^@/, '')
            .trim();
          const prior = byHandle.get(handle.toLowerCase());
          if (prior) {
            prior.note = `${prior.note}${NOTE_JOIN}${text}`.slice(0, LIMITS.follower.note.max);
          } else {
            byHandle.set(handle.toLowerCase(), {
              name: (name || handle).slice(0, LIMITS.follower.name.max),
              handle,
              note: text.slice(0, LIMITS.follower.note.max),
            });
          }
        }
      }
      return { source: 'youtube', commenters: [...byHandle.values()] };
    },
  };
}

export type YoutubeClient = ReturnType<typeof createYoutubeClient>;

const SAMPLE_COMMENTS: Array<[string, string]> = [
  ['Priya Shah', 'Would love a Lisbon guide that keeps it under $60 a day'],
  ['Sam Ortiz', 'More street food episodes please, and the film photography setup'],
  ['Dana Kim', 'How do you plan a route when you only have a weekend?'],
  ['Leo Martin', 'Solo travel tips for a first trip abroad would be great'],
  ['Ana Costa', 'What do you pack for two weeks in one carry-on?'],
  ['Jo Evans', 'Hostel or hotel? I never know what to book'],
];

/** Deterministic made-up commenters for the unkeyed fallback; the handle keeps them unique per channel. */
export function sampleCommenters(channelHandle: string): YoutubeCommenter[] {
  const slug = channelHandle.replace(/^@/, '').toLowerCase().slice(0, 20);
  return SAMPLE_COMMENTS.map(([name, note], index) => ({
    name,
    handle: `sample-${slug}-${index + 1}`,
    note,
  }));
}
