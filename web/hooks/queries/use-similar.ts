import { useQuery } from '@tanstack/react-query';
import { getSimilar, getStudioSimilar } from '@/api/similar';

// Studio keys sit under 'studio' so every studio invalidation refreshes them.
export const similarKeys = {
  member: (postId: string) => ['similar', postId] as const,
  studio: (postId: string) => ['studio', 'similar', postId] as const,
};

/** Similar ideas and people who could help for one post (F17). */
export function useSimilar(postId: string, scope: 'member' | 'studio') {
  return useQuery({
    queryKey: scope === 'studio' ? similarKeys.studio(postId) : similarKeys.member(postId),
    queryFn: ({ signal }) =>
      scope === 'studio' ? getStudioSimilar(postId, signal) : getSimilar(postId, signal),
    staleTime: 5 * 60_000,
  });
}
