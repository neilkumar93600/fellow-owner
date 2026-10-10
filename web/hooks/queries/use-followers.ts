import type { FollowersPage, UpdateFollowerInput } from '@fellow-owners/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  autoTagFollowers,
  createFollower,
  deleteFollower,
  getFollowers,
  importFollowers,
  tagFollowers,
  updateFollower,
} from '@/api/followers';
import { useCursorPages } from '@/hooks/use-cursor-list';
import { studioKeys } from '@/hooks/use-space';
import { shouldRetry } from '@/lib/query-client';
import { toastError } from '@/lib/toast';

export const FOLLOWERS_PAGE_SIZE = 20;

export interface FollowerFilters {
  /** Matches name, handle, email and note. */
  q?: string | null;
  /** Community slug, or `untagged`. */
  community?: string | null;
  joined?: 'yes' | 'no' | null;
}

interface FollowerListFilters {
  q?: string;
  community?: string;
  joined?: 'yes' | 'no';
}

function listFilters({ q, community, joined }: FollowerFilters): FollowerListFilters {
  return {
    q: q?.trim() || undefined,
    community: community?.trim().toLowerCase() || undefined,
    joined: joined ?? undefined,
  };
}

// Under 'studio', so studioKeys.all (every studio mutation) refreshes the roster too.
export const followerKeys = {
  all: ['studio', 'followers'] as const,
  list: (filters: FollowerFilters) =>
    ['studio', 'followers', 'list', listFilters(filters)] as const,
};

/** The roster, newest first, 20 a page on ?page=. `counts` cover the whole roster. */
export function useFollowers(filters: FollowerFilters = {}) {
  const queryKey = followerKeys.list(filters);
  const params = queryKey[3];
  const list = useCursorPages<FollowersPage>({
    queryKey,
    fetchPage: (cursor, signal) =>
      getFollowers({ ...params, cursor, limit: FOLLOWERS_PAGE_SIZE }, signal),
    pageSize: FOLLOWERS_PAGE_SIZE,
    total: (page) => page.total,
  });
  return {
    ...list,
    items: list.data?.items ?? [],
    total: list.data?.total,
    counts: list.data?.counts,
  };
}

/**
 * A roster write. Stays pending until the studio queries (followers, community follower counts,
 * insights) have refreshed. Errors toast with a Retry unless `quiet` (the screen shows them itself).
 */
function useFollowerMutation<V, R>(mutationFn: (vars: V) => Promise<R>, quiet = false) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: studioKeys.all }),
    onError: (error, vars) => {
      if (quiet) return;
      toastError(error, {
        retry: shouldRetry(0, error) ? () => mutation.mutate(vars) : undefined,
      });
    },
  });
  return mutation;
}

/** Add one by hand; 409 when the email or platform + handle is already listed. */
export function useCreateFollower() {
  return useFollowerMutation(createFollower);
}

/** Edit fields; `communityIds` replaces the tags. */
export function useUpdateFollower() {
  return useFollowerMutation(({ id, patch }: { id: string; patch: UpdateFollowerInput }) =>
    updateFollower(id, patch),
  );
}

export function useDeleteFollower() {
  return useFollowerMutation(deleteFollower);
}

/** CSV or pasted lines; the import panel shows its own errors inline. */
export function useImportFollowers() {
  return useFollowerMutation(importFollowers, true);
}

/** Add or remove one community on the selected followers. */
export function useTagFollowers() {
  return useFollowerMutation(tagFollowers);
}

/** The AI tags untagged followers from their notes (or the given ids). */
export function useAutoTagFollowers() {
  return useFollowerMutation(autoTagFollowers);
}
