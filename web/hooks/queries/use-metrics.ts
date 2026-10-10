import type { MetricsQuery } from '@fellow-owners/shared';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getStudioMetrics } from '@/api/metrics';

// Under the 'studio' prefix so every studio invalidation (studioKeys.all) refreshes it.
export const metricsKeys = {
  all: ['studio', 'metrics'] as const,
  window: (days: 7 | 30) => ['studio', 'metrics', days] as const,
};

/** Pilot analytics for the last 7 or 30 days; the last window stays shown while the next loads. */
export function useMetrics(days: NonNullable<MetricsQuery['days']> = 30) {
  return useQuery({
    queryKey: metricsKeys.window(days),
    queryFn: ({ signal }) => getStudioMetrics({ days }, signal),
    placeholderData: keepPreviousData,
  });
}
