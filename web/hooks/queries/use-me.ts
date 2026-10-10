import type { MySpace, UpdateMembershipInput, ViewerMembership } from '@fellow-owners/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { feedKeys } from '@/hooks/queries/use-feed';
import { spacePageKeys } from '@/hooks/queries/use-space-page';
import { membershipKeys } from '@/hooks/use-membership';
import { getMe, updateMe } from '@/lib/api/spaces';
import { toastError } from '@/lib/toast';

export const meKeys = {
  all: ['me'] as const,
  detail: (handle: string) => [...meKeys.all, handle] as const,
};

/** My space: own posts, teams, pitches with the creator's replies, caps left today. 403 for non-members. */
export function useMe(handle: string) {
  return useQuery({
    queryKey: meKeys.detail(handle),
    queryFn: ({ signal }) => getMe(handle, signal),
  });
}

/** Saves the viewer's own profile (headline, intro, skills, links, joined communities). Failures toast. */
export function useUpdateMe(handle: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateMembershipInput) => updateMe(handle, input),
    onSuccess: (membership, input) => {
      queryClient.setQueryData<ViewerMembership>(
        membershipKeys.detail(handle),
        (old) => old && { ...old, membership },
      );
      queryClient.setQueryData<MySpace>(
        meKeys.detail(handle),
        (old) => old && { ...old, membership },
      );
      if (input.communityIds) {
        // A new joined set changes My space's communities, where the viewer may post, and member counts.
        for (const queryKey of [
          meKeys.detail(handle),
          feedKeys.space(handle),
          spacePageKeys.detail(handle),
        ]) {
          void queryClient.invalidateQueries({ queryKey });
        }
      }
    },
    onError: (error) => toastError(error),
  });
}
