import type { PeoplePage } from '@fellow-owners/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getPeople, removePerson, setPersonCommunities } from '@/api/studio';
import { useCursorPages } from '@/hooks/use-cursor-list';
import { studioKeys } from '@/hooks/use-space';
import { shouldRetry } from '@/lib/query-client';
import { toastError } from '@/lib/toast';

export const PEOPLE_PAGE_SIZE = 20;

export interface PeopleFilters {
  /** Matches skills, headline, intro, name and post text. */
  q?: string | null;
  /** Community slug. */
  community?: string | null;
}

interface PeopleListFilters {
  q?: string;
  community?: string;
}

function listFilters({ q, community }: PeopleFilters): PeopleListFilters {
  return { q: q?.trim() || undefined, community: community?.trim().toLowerCase() || undefined };
}

export const peopleKeys = {
  all: ['studio', 'people'] as const,
  list: (filters: PeopleFilters) => ['studio', 'people', 'list', listFilters(filters)] as const,
};

/**
 * Members ranked by contributions (owner and removed members excluded), 20 a page with numbered
 * pages (?page=, or `urlParam` when a screen pages two lists). `rising` is the fortnight's top 10,
 * the same on every page and filter. The last page stays shown while the next one loads.
 */
export function usePeople(
  filters: PeopleFilters = {},
  { urlParam }: { urlParam?: string | null } = {},
) {
  const queryKey = peopleKeys.list(filters);
  const params = queryKey[3];
  const list = useCursorPages<PeoplePage>({
    queryKey,
    fetchPage: (cursor, signal) =>
      getPeople({ ...params, cursor, limit: PEOPLE_PAGE_SIZE }, signal),
    pageSize: PEOPLE_PAGE_SIZE,
    total: (page) => page.total,
    urlParam,
  });
  return {
    ...list,
    items: list.data?.items ?? [],
    rising: list.data?.rising ?? [],
    total: list.data?.total,
  };
}

/** Removes a member (after a confirm). Stays pending until the lists have refreshed. */
export function useRemovePerson() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (membershipId: string) => removePerson(membershipId),
    // Members count on Today, in the communities, the rising strip and every list.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: studioKeys.all }),
    onError: (error, membershipId) => {
      toastError(error, {
        retry: shouldRetry(0, error)
          ? () => {
              mutation.mutate(membershipId);
            }
          : undefined,
      });
    },
  });
  return mutation;
}

/** Moves a member between communities; the people, communities and Today queries all refresh. */
export function useSetPersonCommunities() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      membershipId,
      communityIds,
    }: {
      membershipId: string;
      communityIds: string[];
    }) => setPersonCommunities(membershipId, { communityIds }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: studioKeys.all }),
    onError: (error) => toastError(error),
  });
}
