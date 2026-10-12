import type { MySpace, UpdateMembershipInput, ViewerMembership } from '@fellow-owners/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { feedKeys } from '@/hooks/queries/use-feed';
import { spacePageKeys } from '@/hooks/queries/use-space-page';
import { membershipKeys } from '@/hooks/use-membership';
import { getMe, getMyPitches, getMyPosts, updateMe } from '@/lib/api/spaces';
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

/** `more` appended to `list`, skipping ids already held. */
function appendNew<T extends { id: string }>(list: T[], more: T[]): T[] {
  const held = new Set(list.map((item) => item.id));
  return [...list, ...more.filter((item) => !held.has(item.id))];
}

/**
 * My space "Show more" for own posts: the page older than `before` (the last id held) is appended to
 * the cached MySpace, so every other write keeps patching one list. Failures toast.
 */
export function useMoreMyPosts(handle: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (before: string) => getMyPosts(handle, { before }),
    onSuccess: (page) =>
      queryClient.setQueryData<MySpace>(
        meKeys.detail(handle),
        (old) => old && { ...old, posts: appendNew(old.posts, page.items) },
      ),
    onError: (error) => toastError(error),
  });
}

/** My space "Show more" for own pitches, appended like useMoreMyPosts. Failures toast. */
export function useMoreMyPitches(handle: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (before: string) => getMyPitches(handle, { before }),
    onSuccess: (page) =>
      queryClient.setQueryData<MySpace>(
        meKeys.detail(handle),
        (old) => old && { ...old, pitches: appendNew(old.pitches, page.items) },
      ),
    onError: (error) => toastError(error),
  });
}
