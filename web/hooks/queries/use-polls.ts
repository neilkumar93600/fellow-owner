import type {
  BackProjectInput,
  CreatePollInput,
  CreateProjectUpdateInput,
  PollVoteInput,
} from '@fellow-owners/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { postKeys } from '@/hooks/queries/use-post';
import { ensureStudioHandle, studioKeys } from '@/hooks/use-space';
import {
  backProject,
  closePoll,
  createPoll,
  createProjectUpdate,
  deleteProjectUpdate,
  getPoll,
  getProjectUpdates,
  setFeedbackWanted,
  setFollowing,
  unbackProject,
  votePoll,
} from '@/lib/api/polls';
import { toastError } from '@/lib/toast';

// F4 Fan collaboration: polls, project updates, "feedback wanted", follows (members) and the
// creator's backing. Keys live under the post (postKeys.detail), so a write refreshes the post too.

export const collabKeys = {
  poll: (postId: string) => [...postKeys.detail(postId), 'poll'] as const,
  updates: (postId: string) => [...postKeys.detail(postId), 'updates'] as const,
};

/** The post's poll; 404 (no poll) is not retried. Pass enabled=false when PostCard.hasPoll is false. */
export function usePoll(postId: string, enabled = true) {
  return useQuery({
    queryKey: collabKeys.poll(postId),
    queryFn: ({ signal }) => getPoll(postId, signal),
    enabled,
  });
}

/** The project's updates timeline, newest first (first page; `before` pages on). */
export function useProjectUpdates(postId: string) {
  return useQuery({
    queryKey: collabKeys.updates(postId),
    queryFn: ({ signal }) => getProjectUpdates(postId, {}, signal),
  });
}

/** A write on one post: refreshes the post and its collab reads; errors toast unless `quiet`. */
function usePostMutation<V, R>(postId: string, mutationFn: (vars: V) => Promise<R>, quiet = false) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: postKeys.detail(postId) }),
    onError: (error) => {
      if (!quiet) toastError(error);
    },
  });
}

export function useCreatePoll(postId: string) {
  return usePostMutation(postId, (input: CreatePollInput) => createPoll(postId, input), true);
}

export function useVotePoll(postId: string) {
  return usePostMutation(postId, (input: PollVoteInput) => votePoll(postId, input));
}

export function useClosePoll(postId: string) {
  return usePostMutation(postId, () => closePoll(postId));
}

export function useCreateProjectUpdate(postId: string) {
  return usePostMutation(
    postId,
    (input: CreateProjectUpdateInput) => createProjectUpdate(postId, input),
    true,
  );
}

export function useDeleteProjectUpdate(postId: string) {
  return usePostMutation(postId, (updateId: string) => deleteProjectUpdate(postId, updateId));
}

/** `mutate(true)` asks for feedback, `mutate(false)` stops (the project author). */
export function useFeedbackWanted(postId: string) {
  return usePostMutation(postId, (on: boolean) => setFeedbackWanted(postId, on));
}

/** `mutate(true)` follows the project's updates, `mutate(false)` stops. */
export function useFollowPost(postId: string) {
  return usePostMutation(postId, (on: boolean) => setFollowing(postId, on));
}

/**
 * The creator backs a project (`mutate({ note })`) or stops (`mutate(null)`). Refreshes the post
 * and the studio lists that show the badge.
 */
export function useBacking(postId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: BackProjectInput | null) => {
      const handle = await ensureStudioHandle(queryClient);
      return input ? backProject(handle, postId, input) : unbackProject(handle, postId);
    },
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: postKeys.detail(postId) }),
        queryClient.invalidateQueries({ queryKey: studioKeys.all }),
      ]),
    onError: (error) => toastError(error),
  });
}
