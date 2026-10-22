import {
  LIMITS,
  type LookupPlatform,
  PLATFORM_FANS_LIMITS,
  type PlatformFansSkipReason,
} from '@fellow-owners/shared';
import { createPlatformLookup, type ProfileTarget, profileUrlFor } from './platform-lookup.js';
import {
  createYoutubeClient,
  parseChannelUrl,
  type YoutubeCommenter,
  YoutubeError,
} from './youtube.js';

/**
 * Fans from platform comments: a profile link -> the people who commented on its recent posts.
 * Instagram and TikTok: the profile lookup (lib/platform-lookup.ts, recent posts on) gives the
 * post URLs, then one Apify comment-scraper run reads them all (60 s abort, maxTotalChargeUsd).
 * YouTube: lib/youtube.ts (Data API v3). X is never fetched (replies cost too much).
 * Only post URLs the lookup returned ever reach Apify, never the pasted link.
 */

export type Commenter = YoutubeCommenter;
type CommentPlatform = 'instagram' | 'tiktok';
export type FansPlatform = Exclude<LookupPlatform, 'x'>;

export type FansFetch =
  | { status: 'ok'; posts: number; commenters: Commenter[] }
  | { status: 'skipped'; reason: PlatformFansSkipReason };

export const COMMENT_ACTORS: Record<CommentPlatform, string> = {
  instagram: 'apify~instagram-comment-scraper',
  tiktok: 'clockworks~tiktok-comments-scraper',
};

/** Per run: postsMax x commentsPerPost comments at ~$2.60 (Instagram) to $5 (TikTok) per 1,000. */
const MAX_CHARGE_USD = '0.50';
const NOTE_JOIN = ' | ';
const F = LIMITS.follower;

function commentsInput(platform: CommentPlatform, postUrls: string[]): Record<string, unknown> {
  const per = PLATFORM_FANS_LIMITS.commentsPerPost;
  return platform === 'instagram'
    ? { directUrls: postUrls, resultsLimit: per, includeNestedComments: false }
    : { postURLs: postUrls, commentsPerPost: per, maxRepliesPerComment: 0 };
}

type Item = Record<string, unknown>;
const str = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value.trim() : null;

/**
 * One comment actor's dataset -> commenters, one per handle (case-insensitive, their comments
 * joined into the note), first seen first, at most peopleMax. Error items, handles a follower
 * cannot store and the creator's own replies are dropped. Pure: unit tested against saved outputs.
 */
export function mapCommenters(
  platform: CommentPlatform,
  data: unknown,
  creatorHandle = '',
): Commenter[] {
  if (!Array.isArray(data)) return [];
  const creator = creatorHandle.toLowerCase();
  const byHandle = new Map<string, Commenter>();
  for (const raw of data) {
    if (typeof raw !== 'object' || raw === null) continue;
    const item = raw as Item;
    if (item.error !== undefined || item.errorCode !== undefined) continue;
    const owner = (item.owner ?? {}) as Item;
    const handle = (
      platform === 'instagram'
        ? (str(item.ownerUsername) ?? str(owner.username))
        : str(item.uniqueId)
    )?.replace(/^@+/, '');
    if (!handle || handle.length > F.handle.max || !LIMITS.socialHandle.pattern.test(handle)) {
      continue;
    }
    const key = handle.toLowerCase();
    if (key === creator) continue;
    const text = str(item.text) ?? '';
    const prior = byHandle.get(key);
    if (prior) {
      if (text)
        prior.note = (prior.note ? `${prior.note}${NOTE_JOIN}${text}` : text).slice(0, F.note.max);
      continue;
    }
    if (byHandle.size >= PLATFORM_FANS_LIMITS.peopleMax) continue;
    const name = str(platform === 'instagram' ? owner.full_name : item.nickname) ?? handle;
    byHandle.set(key, {
      name: name.slice(0, F.name.max),
      handle,
      note: text.slice(0, F.note.max),
    });
  }
  return [...byHandle.values()];
}

export interface PlatformFansDeps {
  apifyToken: string | undefined;
  /** env.APIFY_ENABLED (already false without a token). */
  apifyEnabled: boolean;
  youtubeKey: string | undefined;
  fetch?: typeof fetch;
  /** Client-side abort for one Apify call (default 60 s; the run itself is capped at 50 s). */
  timeoutMs?: number;
  logger?: { warn(fields: object, message: string): void };
}

export function createPlatformFans(deps: PlatformFansDeps) {
  // Late-bound, so a stubbed global fetch (tests) reaches every call.
  const doFetch: typeof fetch = deps.fetch ?? ((input, init) => fetch(input, init));
  const timeoutMs = deps.timeoutMs ?? 60_000;
  const lookup = createPlatformLookup({
    token: deps.apifyToken,
    enabled: deps.apifyEnabled,
    fetch: doFetch,
    timeoutMs,
    ...(deps.logger ? { logger: deps.logger } : {}),
  });
  const youtube = createYoutubeClient({ apiKey: deps.youtubeKey, fetch: doFetch });

  /** Null when the run fails: quota or plan limits, run timeout, 5xx, network, bad JSON. */
  async function scrapeComments(platform: CommentPlatform, postUrls: string[]) {
    const params = new URLSearchParams({
      timeout: '50',
      memory: '1024',
      clean: 'true',
      maxTotalChargeUsd: MAX_CHARGE_USD,
    });
    try {
      const res = await doFetch(
        `https://api.apify.com/v2/acts/${COMMENT_ACTORS[platform]}/run-sync-get-dataset-items?${params}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${deps.apifyToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(commentsInput(platform, postUrls)),
          signal: AbortSignal.timeout(timeoutMs),
        },
      );
      if (!res.ok) {
        deps.logger?.warn({ platform, status: res.status }, 'platform fans: apify refused');
        return null;
      }
      return (await res.json()) as unknown;
    } catch (error) {
      // The token is in a header, never in this message.
      deps.logger?.warn(
        { platform, error: error instanceof Error ? error.name : 'unknown' },
        'platform fans: apify call failed',
      );
      return null;
    }
  }

  return {
    /** Whether a fetch for this platform would be a live (paid or quota) call. */
    live(platform: LookupPlatform): boolean {
      if (platform === 'youtube') return Boolean(deps.youtubeKey);
      if (platform === 'x') return false;
      return deps.apifyEnabled && Boolean(deps.apifyToken);
    },

    /** Live commenters on the profile's recent posts. Never throws for provider failures. */
    async commenters(target: ProfileTarget & { platform: FansPlatform }): Promise<FansFetch> {
      if (target.platform === 'youtube') {
        const channel = parseChannelUrl(profileUrlFor(target));
        if (!channel) return { status: 'skipped', reason: 'not_found' };
        try {
          const found = await youtube.commenters(channel, {
            maxVideos: PLATFORM_FANS_LIMITS.postsMax,
            maxComments: PLATFORM_FANS_LIMITS.postsMax * PLATFORM_FANS_LIMITS.commentsPerPost,
          });
          if (found.source === 'sample') return { status: 'skipped', reason: 'sample' };
          const creator = target.handle.toLowerCase();
          return {
            status: 'ok',
            posts: found.videos,
            commenters: found.commenters.filter((c) => c.handle.toLowerCase() !== creator),
          };
        } catch (error) {
          if (!(error instanceof YoutubeError)) throw error;
          return {
            status: 'skipped',
            reason: error.reason === 'not_found' ? 'not_found' : 'unavailable',
          };
        }
      }

      const found = await lookup.lookup(target, { recent: true });
      if (found.status === 'failed') return { status: 'skipped', reason: found.reason };
      if (found.profile.source !== 'apify') return { status: 'skipped', reason: 'sample' };
      const postUrls = found.profile.recent
        .slice(0, PLATFORM_FANS_LIMITS.postsMax)
        .map((post) => post.url);
      if (postUrls.length === 0) return { status: 'skipped', reason: 'no_comments' };
      const data = await scrapeComments(target.platform, postUrls);
      if (data === null) return { status: 'skipped', reason: 'unavailable' };
      return {
        status: 'ok',
        posts: postUrls.length,
        commenters: mapCommenters(target.platform, data, found.profile.handle),
      };
    },
  };
}

export type PlatformFans = ReturnType<typeof createPlatformFans>;
