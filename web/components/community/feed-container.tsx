'use client';

import type { PostType, PublicCommunity } from '@fellow-owners/shared';
import { useFeed } from '@/hooks/queries/use-feed';
import { useUpdateMe } from '@/hooks/queries/use-me';
import { useSpacePage } from '@/hooks/queries/use-space-page';
import { useMembership } from '@/hooks/use-membership';
import { routes } from '@/lib/routes';
import { toastSuccess } from '@/lib/toast';
import { CommunityFeed } from './feed';
import { useMemberRedirect } from './use-member-redirect';
import { useSpaceChallenges } from './use-space-challenges';

/**
 * Wires /{handle}/c/{slug} to the API: the feed of the ?type= tab with Load more by cursor, the space's
 * challenges for the pinned card, and Join for a community the viewer has not joined yet. `community` is the bio page's copy, so the header paints
 * before the feed answers.
 */
export function CommunityFeedContainer({
  handle,
  community,
  type,
}: {
  handle: string;
  community: PublicCommunity;
  type: PostType;
}) {
  const feed = useFeed(handle, community.slug, { type });
  const membership = useMembership(handle);
  const updateMe = useUpdateMe(handle);
  const creator = useSpacePage(handle).data?.space.displayName.split(' ')[0];
  const challenges = useSpaceChallenges(handle);
  const redirecting = useMemberRedirect(
    handle,
    feed.error,
    routes.fan.community(handle, community.slug, type === 'idea' ? {} : { type }),
  );

  // The membership cache moves the moment a join is saved, ahead of the feed's refetch.
  const joinedIds = membership.data?.membership?.communityIds;
  const current = feed.community ?? community;
  const joined = feed.viewerJoinedCommunity || (joinedIds?.includes(current.id) ?? false);

  function join() {
    if (!joinedIds) return;
    updateMe.mutate(
      { communityIds: [...joinedIds, current.id] },
      { onSuccess: () => toastSuccess(`Welcome to ${current.name}`) },
    );
  }

  return (
    <CommunityFeed
      handle={handle}
      creator={creator}
      challenges={challenges.data}
      type={type}
      feed={{
        community: current,
        items: feed.items,
        locked: feed.locked,
        preview: feed.preview,
        viewerJoinedCommunity: joined,
      }}
      loading={feed.isLoading || redirecting}
      failure={
        feed.isError && !redirecting
          ? {
              error: feed.error,
              // A failed Load more retries that page; a failed first load, the feed.
              retry: feed.items.length && feed.hasNextPage ? feed.fetchNextPage : feed.refetch,
            }
          : null
      }
      hasMore={feed.hasNextPage}
      loadingMore={feed.isFetchingNextPage}
      onLoadMore={feed.fetchNextPage}
      onJoin={joinedIds ? join : null}
      joining={updateMe.isPending}
    />
  );
}
