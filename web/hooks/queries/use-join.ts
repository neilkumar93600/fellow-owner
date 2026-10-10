import type {
  JoinSpaceInput,
  SuggestCommunitiesInput,
  ViewerMembership,
} from '@fellow-owners/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { joinSpace, suggestCommunities } from '@/api/spaces';
import { feedKeys } from '@/hooks/queries/use-feed';
import { meKeys } from '@/hooks/queries/use-me';
import { spacePageKeys } from '@/hooks/queries/use-space-page';
import { membershipKeys } from '@/hooks/use-membership';
import { toastSuccess } from '@/lib/toast';

/** Mutation keys, for useIsMutating. */
export const joinKeys = {
  all: ['join'] as const,
  suggest: (handle: string) => [...joinKeys.all, handle, 'suggest'] as const,
  confirm: (handle: string) => [...joinKeys.all, handle, 'confirm'] as const,
};

/**
 * Join step 2: AI picks for the intro (10 characters or more). An error (429 included) and
 * `available: false` both mean "Suggestions unavailable": show every community unselected. No toast.
 */
export function useSuggestCommunities(handle: string) {
  return useMutation({
    mutationKey: joinKeys.suggest(handle),
    mutationFn: (input: SuggestCommunitiesInput) => suggestCommunities(handle, input),
  });
}

/**
 * Join step 2, Confirm. On success the membership is cached at once (member routes stop gating
 * before any refetch), the bio page, My space and feeds refetch, and "Welcome in" is toasted.
 * Errors stay inline with a Retry: no toast.
 */
export function useJoinSpace(handle: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: joinKeys.confirm(handle),
    mutationFn: (input: JoinSpaceInput) => joinSpace(handle, input),
    onSuccess: ({ membership }) => {
      queryClient.setQueryData<ViewerMembership>(membershipKeys.detail(handle), {
        signedIn: true,
        isOwner: membership.role === 'owner',
        membership,
      });
      for (const queryKey of [
        spacePageKeys.detail(handle),
        meKeys.detail(handle),
        feedKeys.space(handle),
      ]) {
        void queryClient.invalidateQueries({ queryKey });
      }
      toastSuccess('Welcome in');
    },
  });
}
