import type {
  HandleCheck,
  PlatformLookupResult,
  PlatformProfile,
  SetupSuggestions,
} from '@fellow-owners/shared';
import { apiFetch } from '@/lib/fetcher';

// Typed client for the identity check and the platform auto-fetch (Round 4 spec §6, §11).

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
