import type { Briefing, FeedbackVerdict } from '@fellow-owners/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getBriefing, regenerateBriefing, sendFeedback } from '@/api/studio';
import { ApiError } from '@/lib/fetcher';
import { shouldRetry } from '@/lib/query-client';
import { toastError } from '@/lib/toast';

export const briefingKeys = {
  all: ['studio', 'briefing'] as const,
};

export interface BriefingFeedbackVars {
  /** BriefingHighlight.index */
  index: number;
  /** null clears the vote. */
  verdict: FeedbackVerdict | null;
}

/** Today's AI briefing. Building it can take a few seconds when the day has no digest yet. */
export function useBriefing() {
  return useQuery({
    queryKey: briefingKeys.all,
    queryFn: ({ signal }) => getBriefing(signal),
  });
}

/**
 * Regenerate (5 a day). `canRegenerate` is false while loading, while running and once
 * regenerationsLeft hits 0; a 429 from a race marks the cap reached in the cache.
 */
export function useRegenerateBriefing() {
  const queryClient = useQueryClient();
  const regenerationsLeft = useBriefing().data?.regenerationsLeft ?? 0;
  const mutation = useMutation({
    mutationFn: regenerateBriefing,
    onSuccess: (briefing) => {
      queryClient.setQueryData(briefingKeys.all, briefing);
    },
    onError: (error) => {
      if (error instanceof ApiError && error.code === 'daily_cap_reached') {
        queryClient.setQueryData<Briefing>(
          briefingKeys.all,
          (briefing) => briefing && { ...briefing, regenerationsLeft: 0 },
        );
      }
      toastError(error, {
        retry: shouldRetry(0, error)
          ? () => {
              mutation.mutate();
            }
          : undefined,
      });
    },
  });
  return {
    ...mutation,
    regenerationsLeft,
    canRegenerate: regenerationsLeft > 0 && !mutation.isPending,
  };
}

/** Thumbs up or down on a highlight: shows at once, reverts and toasts if the save fails. */
export function useBriefingFeedback() {
  const queryClient = useQueryClient();

  const setVerdict = (index: number, verdict: FeedbackVerdict | null) =>
    queryClient.setQueryData<Briefing>(
      briefingKeys.all,
      (briefing) =>
        briefing && {
          ...briefing,
          highlights: briefing.highlights.map((highlight) =>
            highlight.index === index ? { ...highlight, feedback: verdict } : highlight,
          ),
        },
    );

  const mutation = useMutation({
    // One vote at a time, so a quick up-then-down lands in the order it was clicked.
    scope: { id: 'briefing-feedback' },
    mutationFn: ({ index, verdict }: BriefingFeedbackVars) => {
      const id = queryClient.getQueryData<Briefing>(briefingKeys.all)?.id;
      if (!id) throw new Error('The briefing is still loading. Try again in a moment.');
      return sendFeedback({ refType: 'briefing_highlight', refId: `${id}:${index}`, verdict });
    },
    onMutate: async ({ index, verdict }) => {
      await queryClient.cancelQueries({ queryKey: briefingKeys.all });
      const previous =
        queryClient
          .getQueryData<Briefing>(briefingKeys.all)
          ?.highlights.find((highlight) => highlight.index === index)?.feedback ?? null;
      setVerdict(index, verdict);
      return { previous };
    },
    // Re-applied in case a refetch raced the save.
    onSuccess: (saved, { index }) => {
      setVerdict(index, saved.verdict);
    },
    onError: (error, vars, context) => {
      setVerdict(vars.index, context?.previous ?? null);
      toastError(error, {
        retry: shouldRetry(0, error)
          ? () => {
              mutation.mutate(vars);
            }
          : undefined,
      });
    },
  });
  return mutation;
}
