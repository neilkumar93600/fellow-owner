import type {
  BestTimesInput,
  CaptionDraftInput,
  CreatePlanItemInput,
  MarkPlanItemInput,
  PlanItemStatus,
  UpdatePlanItemInput,
} from '@fellow-owners/shared';
import {
  keepPreviousData,
  skipToken,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { ensureStudioHandle, useStudioHandle } from '@/hooks/use-space';
import {
  createPlanItem,
  deletePlanItem,
  draftCaption,
  getPlan,
  getPlanItem,
  markPlanItem,
  suggestBestTimes,
  updatePlanItem,
} from '@/lib/api/planner';
import { shouldRetry } from '@/lib/query-client';
import { toastError } from '@/lib/toast';

// F3 Content planner (creator). Under the 'studio' prefix; every write refreshes the planner.

export interface PlanRangeFilter {
  /** ISO instants: [from, to), at most 62 days apart. */
  from: string;
  to: string;
  status?: PlanItemStatus | null;
}

export const plannerKeys = {
  all: ['studio', 'planner'] as const,
  range: (range: PlanRangeFilter) => ['studio', 'planner', 'range', range] as const,
  item: (id: string) => ['studio', 'planner', 'item', id] as const,
};

/** The calendar's items in [from, to); the last range stays shown while the next one loads. */
export function usePlan(range: PlanRangeFilter) {
  const handle = useStudioHandle();
  return useQuery({
    queryKey: plannerKeys.range(range),
    queryFn: handle ? ({ signal }) => getPlan(handle, range, signal) : skipToken,
    placeholderData: keepPreviousData,
  });
}

/** One plan item (the side panel and the reminder view); null id skips the read. */
export function usePlanItem(id: string | null) {
  const handle = useStudioHandle();
  return useQuery({
    queryKey: plannerKeys.item(id ?? ''),
    queryFn: handle && id ? ({ signal }) => getPlanItem(handle, id, signal) : skipToken,
  });
}

/**
 * A planner write: resolves the handle, then refreshes every planner query. Errors toast with a
 * Retry unless `quiet` (the form shows them itself).
 */
function usePlannerMutation<V, R>(
  mutationFn: (handle: string, vars: V) => Promise<R>,
  quiet = false,
) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (vars: V) => mutationFn(await ensureStudioHandle(queryClient), vars),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: plannerKeys.all }),
    onError: (error, vars) => {
      if (quiet) return;
      toastError(error, {
        retry: shouldRetry(0, error) ? () => mutation.mutate(vars) : undefined,
      });
    },
  });
  return mutation;
}

export function useCreatePlanItem() {
  return usePlannerMutation(
    (handle, input: CreatePlanItemInput) => createPlanItem(handle, input),
    true,
  );
}

export function useUpdatePlanItem() {
  return usePlannerMutation(
    (handle, { id, patch }: { id: string; patch: UpdatePlanItemInput }) =>
      updatePlanItem(handle, id, patch),
    true,
  );
}

export function useDeletePlanItem() {
  return usePlannerMutation((handle, id: string) => deletePlanItem(handle, id));
}

/** Posted, skipped, or planned (undo). */
export function useMarkPlanItem() {
  return usePlannerMutation((handle, { id, input }: { id: string; input: MarkPlanItemInput }) =>
    markPlanItem(handle, id, input),
  );
}

/** Best-time suggestions for the item form (a read, but on demand). */
export function useBestTimes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: BestTimesInput) =>
      suggestBestTimes(await ensureStudioHandle(queryClient), input),
  });
}

/** An AI caption draft; the form shows 429 (daily cap) and 503 (AI paused) itself. */
export function useCaptionDraft() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CaptionDraftInput) =>
      draftCaption(await ensureStudioHandle(queryClient), input),
  });
}
