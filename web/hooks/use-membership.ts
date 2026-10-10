import { useQuery } from '@tanstack/react-query';
import { getMembership } from '@/lib/api/spaces';

export const membershipKeys = {
  all: ['membership'] as const,
  detail: (handle: string) => [...membershipKeys.all, handle] as const,
};

/**
 * Who the viewer is in this space: signed in or not, owner or not, and their own membership (null
 * when not a member). Safe signed out. Revalidated on every mount because it gates member routes,
 * and signing in or switching demo identity changes the answer without a page load.
 */
export function useMembership(handle: string) {
  return useQuery({
    queryKey: membershipKeys.detail(handle),
    queryFn: ({ signal }) => getMembership(handle, signal),
    staleTime: 0,
  });
}
