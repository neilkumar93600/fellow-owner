import type { CreateSpaceInput, HandleCheck, StudioSpace } from '@fellow-owners/shared';
import { apiFetch } from '@/lib/fetcher';

// Typed client for everything under /api/studio (creator only). Grows with the dashboard.

/** GET /api/studio/handle-check?handle= : availability plus up to 3 suggestions. */
export function checkHandle(handle: string, signal?: AbortSignal): Promise<HandleCheck> {
  return apiFetch<HandleCheck>(`/api/studio/handle-check?handle=${encodeURIComponent(handle)}`, { signal });
}

/** POST /api/studio/space : finish onboarding; creates the space and the owner membership. */
export function createSpace(input: CreateSpaceInput): Promise<StudioSpace> {
  return apiFetch<StudioSpace>('/api/studio/space', { method: 'POST', json: input });
}

/** GET /api/studio/space : the creator's own space (404 when the user has none yet). */
export function getMySpace(): Promise<StudioSpace> {
  return apiFetch<StudioSpace>('/api/studio/space');
}
