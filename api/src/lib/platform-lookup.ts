import {
  type LookupPlatform,
  PLATFORM_LOOKUP_LIMITS,
  type PlatformLookupFailure,
  type PlatformLookupResult,
  type PlatformProfile,
  type PlatformRecentPost,
} from '@fellow-owners/shared';
import instagramFixture from './platform-fixtures/instagram-miralane.json' with { type: 'json' };
import tiktokFixture from './platform-fixtures/tiktok-miralane.json' with { type: 'json' };
import youtubeFixture from './platform-fixtures/youtube-miralane.json' with { type: 'json' };

/**
 * Platform auto-fetch (Round 4 spec §6): a pasted profile link -> a public PlatformProfile.
 *
 * Resolution order:
 * 1. fixtures: demo handles (miralane, mira, priya) answer from platform-fixtures/ after a short
 *    delay, with the seed's follower counts
 * 2. simulated: no APIFY_TOKEN or APIFY_ENABLED=false -> a deterministic sample profile
 *    (`source: 'simulated'`, the UI shows a "Sample data" chip)
 * 3. Apify run-sync with a 60 s abort and maxTotalChargeUsd; failures become `failed`, except X,
 *    whose free quota is tiny: any X failure answers the labelled sample instead
 *
 * Security: links are parsed strictly (https, exact host allowlist, no credentials or port, a
 * handle regex per platform) and only `{platform, handle}` ever reaches Apify, never the raw URL.
 * Avatars are fetched only from allowlisted CDN hosts (fetchAvatarDataUrl).
 */

export interface ProfileTarget {
  platform: LookupPlatform;
  /** Instagram, TikTok and YouTube handles are lowercased; X keeps the typed case. */
  handle: string;
}

// ---------------------------------------------------------------- URL parsing

const HOSTS: Record<string, LookupPlatform> = {
  'instagram.com': 'instagram',
  'tiktok.com': 'tiktok',
  'youtube.com': 'youtube',
  'youtu.be': 'youtube',
  'x.com': 'x',
  'twitter.com': 'x',
};

/** Paths on the platform that look like a handle but are not one. */
const NOT_HANDLES = new Set([
  'p',
  'reel',
  'reels',
  'tv',
  'explore',
  'stories',
  'accounts',
  'direct',
  'about',
  'developer',
  'legal',
  'home',
  'i',
  'search',
  'settings',
  'intent',
  'share',
  'messages',
  'notifications',
  'compose',
  'login',
  'signup',
  'tos',
  'privacy',
  'hashtag',
]);

const HANDLE_PATTERNS: Record<LookupPlatform, RegExp> = {
  instagram: /^\/([a-z0-9._]{1,30})\/?$/i,
  tiktok: /^\/@([a-z0-9._]{2,24})(?:\/.*)?$/i,
  youtube: /^\/(?:@([a-z0-9._-]{3,30})|channel\/(UC[a-zA-Z0-9_-]{22}))(?:\/.*)?$/i,
  x: /^\/([a-z0-9_]{1,15})\/?$/i,
};

/**
 * `{platform, handle}` from a pasted profile link, or null when the link is not a supported
 * public profile. A bare "instagram.com/name" gets https://; any other scheme is refused.
 */
export function parseProfileUrl(raw: string): ProfileTarget | null {
  const value = raw.trim();
  if (!value || value.length > 2048) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
  const host = url.hostname.toLowerCase().replace(/^(?:www|m|mobile)\./, '');
  const platform = HOSTS[host];
  if (!platform) return null;
  const match = HANDLE_PATTERNS[platform].exec(url.pathname);
  if (!match) return null;
  const channelId = match[2];
  if (channelId) return { platform, handle: channelId };
  const handle = match[1] ?? '';
  if (NOT_HANDLES.has(handle.toLowerCase())) return null;
  return { platform, handle: platform === 'x' ? handle : handle.toLowerCase() };
}

/** The canonical profile URL we build ourselves (never the pasted one). */
export function profileUrlFor({ platform, handle }: ProfileTarget): string {
  switch (platform) {
    case 'instagram':
      return `https://www.instagram.com/${handle}`;
    case 'tiktok':
      return `https://www.tiktok.com/@${handle}`;
    case 'youtube':
      return handle.startsWith('UC') && handle.length === 24
        ? `https://www.youtube.com/channel/${handle}`
        : `https://www.youtube.com/@${handle}`;
    case 'x':
      return `https://x.com/${handle}`;
  }
}

// ---------------------------------------------------------------- Apify actors

export const APIFY_ACTORS: Record<LookupPlatform, string> = {
  instagram: 'apify~instagram-profile-scraper',
  tiktok: 'clockworks~tiktok-profile-scraper',
  youtube: 'streamers~youtube-channel-scraper',
  x: 'apidojo~twitter-user-scraper',
};

/** apidojo/twitter-user-scraper refuses runs with fewer than 5 inputs. */
const X_MIN_HANDLES = 5;

function actorInput(target: ProfileTarget, recent: boolean): Record<string, unknown> {
  const per = recent ? 6 : 1;
  switch (target.platform) {
    case 'instagram':
      return { usernames: [target.handle] };
    case 'tiktok':
      return {
        profiles: [target.handle],
        resultsPerPage: per,
        profileSorting: 'latest',
        excludePinnedPosts: true,
      };
    case 'youtube':
      return {
        startUrls: [{ url: profileUrlFor(target) }],
        maxResults: per,
        maxResultsShorts: 0,
        maxResultStreams: 0,
        sortVideosBy: 'NEWEST',
      };
    case 'x':
      // Pad with the same handle; the mapper keeps the one matching user (dedupe).
      return {
        twitterHandles: Array.from({ length: X_MIN_HANDLES }, () => target.handle),
        maxItems: X_MIN_HANDLES,
      };
  }
}

// ---------------------------------------------------------------- mappers

type Item = Record<string, unknown>;

const str = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value.trim() : null;
const num = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.round(value) : null;
const iso = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const time = Date.parse(value);
  return Number.isNaN(time) ? null : new Date(time).toISOString();
};
const httpsUrl = (value: unknown): string | null => {
  const s = str(value);
  return s?.startsWith('https://') ? s.slice(0, 2048) : null;
};

const RELATIVE_UNITS: Record<string, number> = {
  s: 1e3,
  sec: 1e3,
  second: 1e3,
  m: 6e4,
  min: 6e4,
  minute: 6e4,
  h: 36e5,
  hr: 36e5,
  hour: 36e5,
  d: 864e5,
  day: 864e5,
  w: 6048e5,
  wk: 6048e5,
  week: 6048e5,
  mo: 2592e6,
  month: 2592e6,
  y: 31536e6,
  yr: 31536e6,
  year: 31536e6,
};

/** YouTube's "2h ago" / "3 weeks ago" -> ISO, relative to the fetch. */
function relativeDate(value: unknown, now: Date): string | null {
  const absolute = iso(value);
  if (absolute) return absolute;
  if (typeof value !== 'string') return null;
  const match = /^(\d+)\s*([a-z]+?)s?\s+ago$/i.exec(value.trim());
  const unit = match ? RELATIVE_UNITS[match[2]?.toLowerCase() ?? ''] : undefined;
  if (!match || !unit) return null;
  return new Date(now.getTime() - Number(match[1]) * unit).toISOString();
}

function post(
  title: unknown,
  url: unknown,
  views: unknown,
  likes: unknown,
  postedAt: string | null,
): PlatformRecentPost | null {
  const text = str(title);
  const link = httpsUrl(url);
  if (!text || !link) return null;
  return { title: text.slice(0, 2200), url: link, views: num(views), likes: num(likes), postedAt };
}

function newestFirst(posts: Array<PlatformRecentPost | null>): PlatformRecentPost[] {
  return posts
    .filter((p): p is PlatformRecentPost => p !== null)
    .sort((a, b) => (b.postedAt ?? '').localeCompare(a.postedAt ?? ''))
    .slice(0, PLATFORM_LOOKUP_LIMITS.recentMax);
}

function failureFrom(item: Item): PlatformLookupFailure {
  const text = `${String(item.error ?? '')} ${String(item.errorCode ?? '')} ${String(item.note ?? '')}`;
  if (/private|protected/i.test(text)) return 'private';
  if (/not.?found|does.?n[o']t exist|no such|unavailable user|404/i.test(text)) {
    return 'not_found';
  }
  return 'unavailable';
}

const failed = (reason: PlatformLookupFailure): PlatformLookupResult => ({
  status: 'failed',
  reason,
});

/**
 * One actor's dataset -> a profile. Pure: unit tested against saved real outputs in
 * tests/fixtures/apify/. Empty datasets and error items become `failed`.
 */
export function mapApifyItems(
  platform: LookupPlatform,
  handle: string,
  data: unknown,
  now: Date = new Date(),
): PlatformLookupResult {
  if (!Array.isArray(data)) return failed('unavailable');
  const items = data.filter((item): item is Item => typeof item === 'object' && item !== null);
  const valid = items.filter((item) => item.error === undefined && item.errorCode === undefined);
  const first = valid[0];
  if (!first) return failed(items[0] ? failureFrom(items[0]) : 'not_found');
  const base = { platform, source: 'apify' as const, fetchedAt: now.toISOString() };

  switch (platform) {
    case 'instagram': {
      if (first.private === true) return failed('private');
      const username = str(first.username) ?? handle;
      const posts = Array.isArray(first.latestPosts) ? (first.latestPosts as Item[]) : [];
      return {
        status: 'ready',
        profile: {
          ...base,
          handle: username.toLowerCase(),
          displayName: str(first.fullName),
          avatarUrl: httpsUrl(first.profilePicUrlHD) ?? httpsUrl(first.profilePicUrl),
          bio: str(first.biography),
          followers: num(first.followersCount),
          verified: first.verified === true,
          profileUrl: profileUrlFor({ platform, handle: username.toLowerCase() }),
          recent: newestFirst(
            posts
              .filter((p) => p.isPinned !== true)
              .map((p) => post(p.caption, p.url, p.videoViewCount, p.likesCount, iso(p.timestamp))),
          ),
        },
      };
    }
    case 'tiktok': {
      const author = (first.authorMeta ?? {}) as Item;
      if (author.privateAccount === true) return failed('private');
      const username = (str(author.name) ?? handle).toLowerCase();
      return {
        status: 'ready',
        profile: {
          ...base,
          handle: username,
          displayName: str(author.nickName),
          avatarUrl: httpsUrl(author.avatar),
          bio: str(author.signature),
          followers: num(author.fans),
          verified: author.verified === true,
          profileUrl: profileUrlFor({ platform, handle: username }),
          recent: newestFirst(
            valid
              .filter((v) => v.isPinned !== true)
              .map((v) =>
                post(v.text, v.webVideoUrl, v.playCount, v.diggCount, iso(v.createTimeISO)),
              ),
          ),
        },
      };
    }
    case 'youtube': {
      const about = (first.aboutChannelInfo ?? {}) as Item;
      const field = (key: string) => first[key] ?? about[key];
      const username = (str(field('channelUsername')) ?? handle).toLowerCase();
      return {
        status: 'ready',
        profile: {
          ...base,
          handle: username,
          displayName: str(field('channelName')),
          avatarUrl: httpsUrl(field('channelAvatarUrl')),
          bio: str(field('channelDescription'))?.slice(0, 1000) ?? null,
          followers: num(field('numberOfSubscribers')),
          verified: field('isChannelVerified') === true,
          profileUrl: profileUrlFor({ platform, handle: username }),
          // The channel scraper returns no likes.
          recent: newestFirst(
            valid
              .filter((v) => str(v.title))
              .map((v) => post(v.title, v.url, v.viewCount, null, relativeDate(v.date, now))),
          ),
        },
      };
    }
    case 'x': {
      // The padded run returns the user (maybe several times) plus related accounts.
      const user = valid.find((v) => str(v.userName)?.toLowerCase() === handle.toLowerCase());
      if (!user) return failed('not_found');
      if (user.protected === true) return failed('private');
      const username = str(user.userName) ?? handle;
      const avatar = httpsUrl(user.profilePicture)?.replace(/_normal(\.\w+)$/, '_400x400$1');
      return {
        status: 'ready',
        profile: {
          ...base,
          handle: username,
          displayName: str(user.name),
          avatarUrl: avatar ?? null,
          bio: str(user.description),
          followers: num(user.followers),
          verified: user.isVerified === true || user.isBlueVerified === true,
          profileUrl: profileUrlFor({ platform, handle: username }),
          recent: [],
        },
      };
    }
  }
}

// ---------------------------------------------------------------- fixtures and samples

const DEMO_HANDLES = new Set(['miralane', 'mira', 'priya']);
const FIXTURES: Partial<Record<LookupPlatform, unknown>> = {
  instagram: instagramFixture,
  tiktok: tiktokFixture,
  youtube: youtubeFixture,
};

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const SAMPLE_TOPICS = [
  'A weekend in Lisbon on a budget',
  'What I pack for a two-week trip',
  'Cheap flights: how I search',
  'My morning routine on the road',
  'Street food tour, ranked',
  'Hostel or hotel? An honest comparison',
  'Editing this trip on my phone',
  'Solo travel: my first night alone',
  'Three days, one backpack',
  'The cafe I keep coming back to',
  'Train vs plane across Europe',
  'Q&A: how I plan a route',
];

/** Deterministic made-up profile, seeded by platform + handle. Always `source: 'simulated'`. */
export function simulatedProfile(
  platform: LookupPlatform,
  handle: string,
  now: Date = new Date(),
): PlatformProfile {
  const seed = hash(`${platform}:${handle.toLowerCase()}`);
  const name = handle
    .replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
  const followers = 1_000 + (seed % 249) * 1_000;
  const recent = Array.from({ length: platform === 'x' ? 0 : 6 }, (_, i) => {
    const topic = SAMPLE_TOPICS[(seed + i * 5) % SAMPLE_TOPICS.length] ?? 'A new video';
    return {
      title: topic,
      url: `${profileUrlFor({ platform, handle })}#sample-${i + 1}`,
      views: Math.round(followers * (0.05 + ((seed >> i) % 20) / 100)),
      likes: Math.round(followers * 0.01),
      postedAt: new Date(now.getTime() - (i + 1) * 3 * 864e5).toISOString(),
    };
  });
  return {
    platform,
    handle,
    displayName: name || handle,
    avatarUrl: null,
    bio: 'Sample profile: we could not load the real one, so edit anything.',
    followers,
    verified: false,
    profileUrl: profileUrlFor({ platform, handle }),
    recent,
    source: 'simulated',
    fetchedAt: now.toISOString(),
  };
}

// ---------------------------------------------------------------- resolver

export interface PlatformLookupDeps {
  token?: string | undefined;
  /** env.APIFY_ENABLED (already false without a token). */
  enabled: boolean;
  fetch?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  now?: () => Date;
  /** Client-side abort for one Apify call (default 60 s; the run itself is capped at 45 s). */
  timeoutMs?: number;
  logger?: { warn(fields: object, message: string): void };
}

export interface LookupOptions {
  /** Recent posts: on for onboarding, off for the daily follower refresh. */
  recent?: boolean;
}

const APIFY_BASE = 'https://api.apify.com/v2/acts';
/** Hard cap per call, on top of the account's monthly spend limit. */
const MAX_CHARGE_USD = '0.05';

export function createPlatformLookup(deps: PlatformLookupDeps) {
  const doFetch = deps.fetch ?? fetch;
  const sleep = deps.sleep ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)));
  const now = deps.now ?? (() => new Date());
  const timeoutMs = deps.timeoutMs ?? 60_000;

  async function callApify(target: ProfileTarget, recent: boolean): Promise<PlatformLookupResult> {
    const params = new URLSearchParams({
      timeout: '45',
      memory: '1024',
      clean: 'true',
      maxTotalChargeUsd: MAX_CHARGE_USD,
    });
    try {
      const res = await doFetch(
        `${APIFY_BASE}/${APIFY_ACTORS[target.platform]}/run-sync-get-dataset-items?${params}`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${deps.token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(actorInput(target, recent)),
          signal: AbortSignal.timeout(timeoutMs),
        },
      );
      if (!res.ok) {
        // 402/403 quota or plan limits, 408 run timeout, 5xx: nothing the creator can fix.
        deps.logger?.warn(
          { platform: target.platform, status: res.status },
          'platform lookup: apify refused',
        );
        return failed('unavailable');
      }
      const result = mapApifyItems(target.platform, target.handle, await res.json(), now());
      if (result.status === 'ready' && !recent) result.profile.recent = [];
      return result;
    } catch (error) {
      // Timeouts, network errors and bad JSON. The token is in a header, never in this message.
      deps.logger?.warn(
        { platform: target.platform, error: error instanceof Error ? error.name : 'unknown' },
        'platform lookup: apify call failed',
      );
      return failed('unavailable');
    }
  }

  return {
    async lookup(
      target: ProfileTarget,
      options: LookupOptions = {},
    ): Promise<PlatformLookupResult> {
      const recent = options.recent ?? true;
      if (DEMO_HANDLES.has(target.handle.toLowerCase())) {
        const fixture = FIXTURES[target.platform];
        await sleep(800 + Math.floor(Math.random() * 700));
        if (!fixture) return failed('not_found');
        const profile = {
          ...(fixture as PlatformProfile),
          fetchedAt: now().toISOString(),
        };
        if (!recent) profile.recent = [];
        return { status: 'ready', profile };
      }
      if (!deps.enabled || !deps.token) {
        return {
          status: 'ready',
          profile: simulatedProfile(target.platform, target.handle, now()),
        };
      }
      const result = await callApify(target, recent);
      if (result.status === 'failed' && target.platform === 'x' && result.reason !== 'private') {
        // X's free quota is a few runs a month: degrade to labelled sample data.
        return { status: 'ready', profile: simulatedProfile('x', target.handle, now()) };
      }
      return result;
    },
  };
}

export type PlatformLookup = ReturnType<typeof createPlatformLookup>;

// ---------------------------------------------------------------- avatars

export const AVATAR_MAX_BYTES = 256 * 1024;

const AVATAR_HOSTS: RegExp[] = [
  /(^|\.)cdninstagram\.com$/,
  /(^|\.)fbcdn\.net$/,
  /(^|\.)tiktokcdn(-[a-z]+)?\.com$/,
  /(^|\.)ggpht\.com$/,
  /(^|\.)ytimg\.com$/,
  /^yt3\.googleusercontent\.com$/,
  /^pbs\.twimg\.com$/,
];

/** https, no credentials or port, and a CDN host the platforms serve avatars from. */
export function isAllowedAvatarHost(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.port) return false;
  const host = url.hostname.toLowerCase();
  return AVATAR_HOSTS.some((pattern) => pattern.test(host));
}

/**
 * Downloads an avatar as a `data:` URL (the repo has no object storage), or null.
 * ponytail: data URLs in spaces.avatar_url; move to object storage when the project has some.
 */
export async function fetchAvatarDataUrl(
  raw: string,
  doFetch: typeof fetch = fetch,
): Promise<string | null> {
  if (!isAllowedAvatarHost(raw)) return null;
  try {
    // redirect: 'error' so a CDN cannot bounce us to a host outside the allowlist.
    const res = await doFetch(raw, { redirect: 'error', signal: AbortSignal.timeout(10_000) });
    const type = (res.headers.get('content-type') ?? '').split(';')[0]?.trim().toLowerCase() ?? '';
    if (!res.ok || !/^image\/(jpeg|png|webp|gif|avif)$/.test(type)) return null;
    if (Number(res.headers.get('content-length') ?? 0) > AVATAR_MAX_BYTES) return null;
    const reader = res.body?.getReader();
    if (!reader) return null;
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > AVATAR_MAX_BYTES) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
    return `data:${type};base64,${Buffer.concat(chunks).toString('base64')}`;
  } catch {
    return null;
  }
}
