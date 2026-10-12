import type {
  PerformancePostsPage,
  PerformancePostsQuery,
  PerformanceQuery,
  PerformanceSummary,
  ProfileScore,
} from '@fellow-owners/shared';
import { type Params, query } from '@/lib/api/studio';
import { apiFetch } from '@/lib/fetcher';

// Typed client for F1 Post performance and F2 Profile score: /api/spaces/:handle/... (creator only;
// 404 for any handle but the creator's own).

const space = (handle: string) => `/api/spaces/${encodeURIComponent(handle)}`;

/** GET /performance?days=7|30|90&tz= : reach, growth, engagement, top posts, best times, trend. */
export function getPerformance(
  handle: string,
  params: Params<PerformanceQuery> = {},
  signal?: AbortSignal,
): Promise<PerformanceSummary> {
  return apiFetch<PerformanceSummary>(`${space(handle)}/performance${query(params)}`, { signal });
}

/** GET /performance/posts?platform=&sort=&cursor=&limit= : the posts behind the numbers. */
export function getPerformancePosts(
  handle: string,
  params: Params<PerformancePostsQuery> = {},
  signal?: AbortSignal,
): Promise<PerformancePostsPage> {
  return apiFetch<PerformancePostsPage>(`${space(handle)}/performance/posts${query(params)}`, {
    signal,
  });
}

/** GET /profile-score : 0-100 with a breakdown and three tips. */
export function getProfileScore(handle: string, signal?: AbortSignal): Promise<ProfileScore> {
  return apiFetch<ProfileScore>(`${space(handle)}/profile-score`, { signal });
}
