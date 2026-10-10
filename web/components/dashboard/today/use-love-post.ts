'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ideasKeys } from '@/hooks/queries/use-ideas';
import { apiFetch } from '@/lib/fetcher';

/** POST /api/studio/posts/:id/love, or DELETE to take it back. Owner only. */
function lovePost(id: string, loved: boolean): Promise<{ lovedAt: string | null }> {
  return apiFetch<{ lovedAt: string | null }>(`/api/studio/posts/${encodeURIComponent(id)}/love`, {
    method: loved ? 'POST' : 'DELETE',
  });
}

/**
 * "Loved by Mira" toggle. The caller shows the new state at once and rolls it back in `onError`; this
 * only sends it and marks the ideas lists stale, so the next visit to Ideas shows the badge.
 */
export function useLovePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, loved }: { id: string; loved: boolean }) => lovePost(id, loved),
    onSuccess: () => {
      // Stale, not refetched: Today's own ideas query would otherwise reshuffle the stack under the creator.
      void queryClient.invalidateQueries({ queryKey: ideasKeys.all, refetchType: 'none' });
    },
  });
}
