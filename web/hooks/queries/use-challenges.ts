import type { ChallengeDetail, ChallengeSummary } from '@fellow-owners/shared';
import { skipToken, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  closeChallenge,
  createChallenge,
  getChallenge,
  getChallenges,
  pickChallengeWinner,
} from '@/lib/api/challenges';
import { shouldRetry } from '@/lib/query-client';
import { toastError } from '@/lib/toast';

export const challengeKeys = {
  all: ['studio', 'challenges'] as const,
  list: ['studio', 'challenges', 'list'] as const,
  detail: (id: string) => ['studio', 'challenges', 'detail', id] as const,
};

/** Every challenge, open and closed. A 404 or 501 means the API does not have challenges yet. */
export function useChallenges() {
  return useQuery({
    queryKey: challengeKeys.list,
    queryFn: ({ signal }) => getChallenges(signal),
    select: (data) => data.items,
  });
}

/** The recap is written in the background after Close: check back this many times (3s apart). */
const RECAP_POLLS = 10;

/**
 * One challenge with its entries (404 for an unknown id). A closed challenge with entries but no AI
 * recap yet checks back every 3 seconds, about 30 seconds in all.
 */
export function useChallenge(id: string | null | undefined) {
  return useQuery({
    queryKey: challengeKeys.detail(id ?? ''),
    queryFn: id ? ({ signal }) => getChallenge(id, signal) : skipToken,
    refetchInterval: ({ state: { data, dataUpdateCount } }) =>
      data?.status === 'closed' &&
      data.entryCount > 0 &&
      data.aiSummary === null &&
      dataUpdateCount < RECAP_POLLS
        ? 3000
        : false,
  });
}

/** Create a challenge, then refresh the list. The sheet decides what to say; failures toast with a retry. */
export function useCreateChallenge() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: createChallenge,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: challengeKeys.all }),
    onError: (error, vars) =>
      toastError(error, {
        retry: shouldRetry(0, error) ? () => mutation.mutate(vars) : undefined,
      }),
  });
  return mutation;
}

/** Puts the server's summary into the open detail at once, then refreshes the list and the entries. */
function settle(queryClient: ReturnType<typeof useQueryClient>, summary: ChallengeSummary) {
  queryClient.setQueryData<ChallengeDetail>(
    challengeKeys.detail(summary.id),
    (detail) => detail && { ...detail, ...summary },
  );
  queryClient.invalidateQueries({ queryKey: challengeKeys.all });
}

/** Close and shortlist: the shortlist arrives in the returned summary. */
export function useCloseChallenge(id: string) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => closeChallenge(id),
    onSuccess: (summary) => settle(queryClient, summary),
    onError: (error) =>
      toastError(error, {
        retry: shouldRetry(0, error) ? () => mutation.mutate() : undefined,
      }),
  });
  return mutation;
}

/** Pick the winning entry; the summary's winnerPostId changes. */
export function usePickWinner(id: string) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (postId: string) => pickChallengeWinner(id, { postId }),
    onSuccess: (summary) => settle(queryClient, summary),
    onError: (error, postId) =>
      toastError(error, {
        retry: shouldRetry(0, error) ? () => mutation.mutate(postId) : undefined,
      }),
  });
  return mutation;
}
