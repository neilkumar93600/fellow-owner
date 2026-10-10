import type { MetricsQuery, StudioMetrics } from '@fellow-owners/shared';
import { type Params, query } from '@/api/studio';
import { apiFetch } from '@/lib/fetcher';

/** GET /api/studio/metrics?days=7|30 (creator only). */
export function getStudioMetrics(
  params: Params<MetricsQuery> = {},
  signal?: AbortSignal,
): Promise<StudioMetrics> {
  return apiFetch<StudioMetrics>(`/api/studio/metrics${query(params)}`, { signal });
}

/**
 * POST /api/spaces/:handle/visit (public, 204). Fire and forget: prefers sendBeacon so it survives
 * a page leaving, falls back to a keepalive fetch.
 */
export function recordVisit(handle: string): void {
  const path = `/api/spaces/${encodeURIComponent(handle)}/visit`;
  try {
    if (typeof navigator !== 'undefined' && navigator.sendBeacon?.(path)) return;
    void fetch(path, { method: 'POST', keepalive: true, credentials: 'include' }).catch(() => {});
  } catch {
    // Analytics must never break the page.
  }
}
