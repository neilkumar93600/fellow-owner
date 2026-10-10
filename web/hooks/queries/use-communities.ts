import type { CreateCommunityInput, UpdateCommunityInput } from '@fellow-owners/shared';
import { skipToken, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { studioKeys } from '@/hooks/use-space';
import { createCommunity, getCommunities, getCommunity, updateCommunity } from '@/lib/api/studio';
import { shouldRetry } from '@/lib/query-client';
import { toastError } from '@/lib/toast';
import { useIdeas } from './use-ideas';
import { usePeople } from './use-people';

export const communityKeys = {
  all: ['studio', 'communities'] as const,
  list: ['studio', 'communities', 'list'] as const,
  detail: (slug: string) => ['studio', 'communities', 'detail', slug] as const,
};

export interface UpdateCommunityVars {
  id: string;
  /** Rename, describe, restyle, reorder; `archived: true` archives, `false` restores. */
  patch: UpdateCommunityInput;
}

/** Every community with its stats, in sort order; archived ones included (archivedAt set). */
export function useStudioCommunities() {
  return useQuery({
    queryKey: communityKeys.list,
    queryFn: ({ signal }) => getCommunities(signal),
  });
}

/**
 * Community detail: stats plus the first 20 members and posts, ranked (404 for an unknown slug).
 * The API returns no cursor here, so the paged tables use useCommunityMembers and
 * useCommunityPosts (same order, with totals).
 */
export function useStudioCommunity(slug: string | null | undefined) {
  return useQuery({
    queryKey: communityKeys.detail(slug ?? ''),
    queryFn: slug ? ({ signal }) => getCommunity(slug, {}, signal) : skipToken,
  });
}

/** The detail's members table: 20 a page, page kept in ?members=; `q` searches name, headline and skills. */
export function useCommunityMembers(slug: string, q?: string) {
  return usePeople({ community: slug, q }, { urlParam: 'members' });
}

/** The detail's posts: 18 a page, page kept in ?posts=. */
export function useCommunityPosts(slug: string) {
  return useIdeas({ community: slug }, { urlParam: 'posts' });
}

/**
 * Add community. Stays pending until the lists have refreshed, so a dialog can close onto the
 * new card. 409 when the slug exists or the space already has 20.
 */
export function useCreateCommunity() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (input: CreateCommunityInput) => createCommunity(input),
    // The space's communityCount, the ideas chips and the people badges follow too.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: studioKeys.all }),
    onError: (error, input) => {
      toastError(error, {
        retry: shouldRetry(0, error)
          ? () => {
              mutation.mutate(input);
            }
          : undefined,
      });
    },
  });
  return mutation;
}

/** Rename, restyle, archive or restore. Stays pending until the views have refreshed. */
export function useUpdateCommunity() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: ({ id, patch }: UpdateCommunityVars) => updateCommunity(id, patch),
    // Names and tints show in chips, badges and panels across the studio.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: studioKeys.all }),
    onError: (error, vars) => {
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
