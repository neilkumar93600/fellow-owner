import type { AnalyticsWindow } from '@fellow-owners/shared';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getCommunityActivity } from '@/api/insights';

// Under the 'studio' prefix so every studio invalidation (studioKeys.all) refreshes it.
export const insightsKeys = {
  all: ['studio', 'insights'] as const,
  communityActivity: (days: AnalyticsWindow) =>
    ['studio', 'insights', 'community-activity', days] as const,
};

/** Communities ranked by activity over the last 7 or 30 days; the last window stays shown while the next loads. */
export function useCommunityActivity(days: AnalyticsWindow = 7) {
  return useQuery({
    queryKey: insightsKeys.communityActivity(days),
    queryFn: ({ signal }) => getCommunityActivity(days, signal),
    placeholderData: keepPreviousData,
  });
}
