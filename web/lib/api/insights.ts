import type { AnalyticsWindow, CommunityActivityReport, ExportKind } from '@fellow-owners/shared';
import { apiFetch } from '@/lib/fetcher';

// Typed client for /api/studio/analytics and /api/studio/export (creator only).

/** GET /analytics/communities?days= : communities by activity score, archived ones left out. */
export function getCommunityActivity(
  days: AnalyticsWindow = 7,
  signal?: AbortSignal,
): Promise<CommunityActivityReport> {
  return apiFetch<CommunityActivityReport>(`/api/studio/analytics/communities?days=${days}`, {
    signal,
  });
}

/**
 * Same-origin path of a CSV download (GET /export/:kind). Use it as an <a href download>: the
 * browser sends the session cookie and saves the attachment.
 */
export function exportUrl(kind: ExportKind): string {
  return `/api/studio/export/${encodeURIComponent(kind)}`;
}
