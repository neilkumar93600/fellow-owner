import type { SpacePage } from '@fellow-owners/shared';
import { useQuery } from '@tanstack/react-query';
import { getSpacePage } from '@/api/spaces';

export const spacePageKeys = {
  all: ['space-page'] as const,
  detail: (handle: string) => [...spacePageKeys.all, handle] as const,
};

/**
 * The public bio page: profile, communities with counts, featured projects. Pass the server
 * render's copy as `initialData` so the page paints without a client fetch.
 */
export function useSpacePage(handle: string, initialData?: SpacePage) {
  return useQuery({
    queryKey: spacePageKeys.detail(handle),
    queryFn: ({ signal }) => getSpacePage(handle, signal),
    initialData,
    // The API caches this page for 60 s, so refetching sooner returns the same copy.
    staleTime: 60_000,
  });
}
