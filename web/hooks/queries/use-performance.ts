import type {
  PerformancePostsQuery,
  PerformanceQuery,
  PerformanceWindow,
} from '@fellow-owners/shared';
import { keepPreviousData, skipToken, useQuery } from '@tanstack/react-query';
import { useStudioHandle } from '@/hooks/use-space';
import { getPerformance, getPerformancePosts, getProfileScore } from '@/lib/api/performance';
import type { Params } from '@/lib/api/studio';

// F1 Post performance and F2 Profile score (creator). Under the 'studio' prefix, so every studio
// invalidation (studioKeys.all) refreshes them too.

export const performanceKeys = {
  all: ['studio', 'performance'] as const,
  summary: (days: PerformanceWindow, tz: string | null) =>
    ['studio', 'performance', 'summary', days, tz] as const,
  posts: (params: Params<PerformancePostsQuery>) =>
    ['studio', 'performance', 'posts', params] as const,
  score: ['studio', 'performance', 'score'] as const,
};

/** The viewer's IANA zone, so best days and hours read in local time; null where Intl has none. */
export function browserTimeZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

/** The Performance page for the last 7, 30 or 90 days; the last window stays shown while the next loads. */
export function usePerformance(days: NonNullable<PerformanceQuery['days']> = 30) {
  const handle = useStudioHandle();
  const tz = browserTimeZone();
  return useQuery({
    queryKey: performanceKeys.summary(days, tz),
    queryFn: handle ? ({ signal }) => getPerformance(handle, { days, tz }, signal) : skipToken,
    placeholderData: keepPreviousData,
  });
}

/** The posts behind the numbers, filtered and sorted (one page; `cursor` for the next). */
export function usePerformancePosts(params: Params<PerformancePostsQuery> = {}) {
  const handle = useStudioHandle();
  return useQuery({
    queryKey: performanceKeys.posts(params),
    queryFn: handle ? ({ signal }) => getPerformancePosts(handle, params, signal) : skipToken,
    placeholderData: keepPreviousData,
  });
}

/** The 0-100 profile score with its breakdown and three tips (Today's card and Performance). */
export function useProfileScore() {
  const handle = useStudioHandle();
  return useQuery({
    queryKey: performanceKeys.score,
    queryFn: handle ? ({ signal }) => getProfileScore(handle, signal) : skipToken,
  });
}
