import type { MediaKit, MediaKitSettings, UpdateMediaKitInput } from '@fellow-owners/shared';
import { apiFetch } from '@/lib/fetcher';

// Typed client for F6 Media kit: /api/spaces/:handle/media-kit. Server components read the public
// kit with getMediaKit in lib/server-api.ts (cached); these are the browser calls.

const kit = (handle: string) => `/api/spaces/${encodeURIComponent(handle)}/media-kit`;

/** GET /media-kit (public): 404 while the creator has it off. */
export function getMediaKit(handle: string, signal?: AbortSignal): Promise<MediaKit> {
  return apiFetch<MediaKit>(kit(handle), { signal });
}

/** GET /media-kit/preview (the creator): the page as brands will see it, even while off. */
export function getMediaKitPreview(handle: string, signal?: AbortSignal): Promise<MediaKit> {
  return apiFetch<MediaKit>(`${kit(handle)}/preview`, { signal });
}

/** PATCH /media-kit (the creator): enabled, rates, note. */
export function updateMediaKitSettings(
  handle: string,
  input: UpdateMediaKitInput,
): Promise<MediaKitSettings> {
  return apiFetch<MediaKitSettings>(kit(handle), { method: 'PATCH', json: input });
}
