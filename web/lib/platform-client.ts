import {
  type HandleCheck,
  LOOKUP_PLATFORMS,
  type LookupPlatform,
  type Platform,
  type PlatformLookupResult,
  type PlatformProfile,
  type SetupSuggestions,
} from '@fellow-owners/shared';
import { apiFetch } from '@/lib/fetcher';

// Typed client for the identity check and the platform auto-fetch (Round 4 spec §6, §11), plus the
// small link helpers the platform cards share (onboarding and Settings).

/** GET /api/handle-available?h= : public, rate-limited (30 a minute per IP). One namespace for handles and usernames. */
export function checkHandleAvailable(handle: string, signal?: AbortSignal): Promise<HandleCheck> {
  return apiFetch<HandleCheck>(`/api/handle-available?h=${encodeURIComponent(handle)}`, {
    signal,
  });
}

/** POST /api/studio/platform-lookup : one public profile; 429 rate_limited after 5 a minute. Never a 500 for a bad link. */
export function lookupPlatform(url: string, signal?: AbortSignal): Promise<PlatformLookupResult> {
  return apiFetch<PlatformLookupResult>('/api/studio/platform-lookup', {
    method: 'POST',
    json: { url },
    signal,
  });
}

/** POST /api/studio/setup-suggestions : name, avatar (data: URL), bio, loves, voice and groups; 10 a day. */
export function getSetupSuggestions(
  profiles: PlatformProfile[],
  signal?: AbortSignal,
): Promise<SetupSuggestions> {
  return apiFetch<SetupSuggestions>('/api/studio/setup-suggestions', {
    method: 'POST',
    json: { profiles },
    signal,
  });
}

// ---------------------------------------------------------------- links

const PLATFORM_HOSTS: [RegExp, Platform][] = [
  [/(^|\.)youtube\.com$|(^|\.)youtu\.be$/, 'youtube'],
  [/(^|\.)instagram\.com$/, 'instagram'],
  [/(^|\.)x\.com$|(^|\.)twitter\.com$/, 'x'],
  [/(^|\.)tiktok\.com$/, 'tiktok'],
  [/(^|\.)linkedin\.com$/, 'linkedin'],
];

/** The handle in a profile path, per platform. A guess for the card; the server parses the link again. */
const HANDLE_IN_PATH: Partial<Record<Platform, RegExp>> = {
  instagram: /^\/([a-z0-9._]{1,30})\/?$/i,
  tiktok: /^\/@([a-z0-9._]{2,24})(?:\/.*)?$/i,
  youtube: /^\/(?:@([a-z0-9._-]{3,30})|channel\/(UC[a-zA-Z0-9_-]{22}))(?:\/.*)?$/i,
  x: /^\/([a-z0-9_]{1,15})\/?$/i,
  linkedin: /^\/in\/([a-z0-9-]{3,100})\/?$/i,
};

/** Guesses the platform from a profile link. */
export function detectPlatform(url: string): Platform | null {
  try {
    const host = new URL(url).host.toLowerCase();
    for (const [pattern, platform] of PLATFORM_HOSTS) if (pattern.test(host)) return platform;
  } catch {
    // not a URL yet
  }
  return null;
}

/** Adds https:// to a bare domain such as "youtube.com/@mira". Leaves anything else as typed. */
export function withProtocol(value: string): string {
  const v = value.trim();
  if (!v || /^[a-z][a-z0-9+.-]*:\/\//i.test(v)) return v;
  if (/^[\w-]+(\.[\w-]+)+(\/|$)/.test(v)) return `https://${v}`;
  return v;
}

/** The platform a pasted link is for, when it is one the lookup reads. */
export function lookupPlatformOf(url: string): LookupPlatform | null {
  const platform = detectPlatform(url);
  return platform && (LOOKUP_PLATFORMS as readonly string[]).includes(platform)
    ? (platform as LookupPlatform)
    : null;
}

/**
 * Platform and handle from a pasted link (https:// added when missing), or null when it is not an
 * http(s) link at all. Any other site is `other`; the handle is null when the path is not a profile.
 */
export function readProfileLink(
  raw: string,
): { url: string; platform: Platform; handle: string | null } | null {
  const url = withProtocol(raw);
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (!/^https?:$/.test(parsed.protocol) || !parsed.hostname.includes('.')) return null;
  const platform = detectPlatform(url) ?? 'other';
  const match = parsed.pathname.match(HANDLE_IN_PATH[platform] ?? /^$/);
  const handle = match ? (match[1] ?? match[2] ?? null) : null;
  return {
    url,
    platform,
    handle: handle && platform !== 'x' ? handle.toLowerCase() : handle,
  };
}

/** "410K", "1.2M", "410,000" or "410000" to a whole number; NaN when unreadable. */
export function parseFollowers(raw: string): number {
  const v = raw
    .trim()
    .replace(/[,\s_]/g, '')
    .toLowerCase();
  if (!v) return Number.NaN;
  const match = v.match(/^(\d+(?:\.\d+)?)([kmb])?$/);
  if (!match) return Number.NaN;
  const base = Number(match[1]);
  const mult = match[2] === 'k' ? 1e3 : match[2] === 'm' ? 1e6 : match[2] === 'b' ? 1e9 : 1;
  return Math.round(base * mult);
}
