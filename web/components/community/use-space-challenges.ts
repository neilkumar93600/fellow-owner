'use client';

import type { ChallengeEntryInput, ChallengeSummary, PostDetail } from '@fellow-owners/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { feedKeys } from '@/hooks/queries/use-feed';
import { meKeys } from '@/hooks/queries/use-me';
import { postKeys } from '@/hooks/queries/use-post';
import { ApiError, apiFetch } from '@/lib/fetcher';

// Fan side of Challenges (contract: GET /api/spaces/:handle/challenges, POST .../challenges/:id/entries).
// Lives here, not in web/api and hooks/queries, so the fan screens own all of it.

export const challengeKeys = {
  list: (handle: string) => ['space-challenges', handle] as const,
};

function path(handle: string): string {
  return `/api/spaces/${encodeURIComponent(handle)}/challenges`;
}

/**
 * Open and recently closed challenges of the space, soonest due first among the open ones. An API that
 * has no challenges route yet (404, 501) or a viewer who may not read them (401, 403) is an empty list:
 * the page simply shows no challenge card. Any other failure is a query error, which the UI also hides.
 */
export function useSpaceChallenges(handle: string) {
  return useQuery({
    queryKey: challengeKeys.list(handle),
    queryFn: async ({ signal }): Promise<ChallengeSummary[]> => {
      try {
        const page = await apiFetch<{ items: ChallengeSummary[] }>(path(handle), { signal });
        return page.items;
      } catch (error) {
        if (error instanceof ApiError && [401, 403, 404, 501].includes(error.status)) return [];
        throw error;
      }
    },
    staleTime: 30_000,
    retry: false,
  });
}

/**
 * Enters a challenge: the entry is stored as an idea post. 409 means the challenge closed or went past
 * due, 403 means the fan is not in the challenge's community; the form shows both as plain sentences, so
 * this hook does not toast.
 */
export function useEnterChallenge(handle: string, challengeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ChallengeEntryInput) =>
      apiFetch<PostDetail>(`${path(handle)}/${encodeURIComponent(challengeId)}/entries`, {
        method: 'POST',
        json: input,
      }),
    onSuccess: (post) => {
      queryClient.setQueryData(postKeys.detail(post.id), post);
      void queryClient.invalidateQueries({
        queryKey: feedKeys.community(handle, post.community.slug),
      });
      void queryClient.invalidateQueries({ queryKey: challengeKeys.list(handle) });
      void queryClient.invalidateQueries({ queryKey: meKeys.detail(handle) });
    },
  });
}

/** The plain-language reason an entry could not be sent. */
export function entryErrorMessage(error: unknown, communityName?: string | null): string {
  if (error instanceof ApiError && error.status === 409) {
    return 'This challenge has closed, so it cannot take new entries.';
  }
  if (error instanceof ApiError && error.status === 403) {
    return communityName
      ? `Join ${communityName} first, then you can enter this challenge.`
      : 'Join the community for this challenge first, then you can enter.';
  }
  return error instanceof ApiError ? error.message : 'Something went wrong. Try again.';
}
