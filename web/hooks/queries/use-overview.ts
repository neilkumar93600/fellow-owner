import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getOverview, sweep } from '@/api/studio';
import { studioKeys } from '@/hooks/use-space';

export const overviewKeys = {
  all: ['studio', 'overview'] as const,
};

/** Today: stat cards, This week, inbox mix, activity chart, pendingAnalysis and aiPaused. */
export function useOverview() {
  return useQuery({
    queryKey: overviewKeys.all,
    queryFn: ({ signal }) => getOverview(signal),
  });
}

/**
 * POST /sweep, called by the dashboard on load. When it claimed items, every studio query is
 * refreshed (overview, inbox, ideas, briefing and the rest; only mounted ones refetch). It is
 * background upkeep, so a failure stays silent: the next load sweeps again.
 */
export function useSweep() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: sweep,
    onSuccess: ({ claimed }) => {
      if (claimed > 0) queryClient.invalidateQueries({ queryKey: studioKeys.all });
    },
  });
}
