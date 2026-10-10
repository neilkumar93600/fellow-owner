import type { FeedPage, LockedPostPreview, PostType } from '@fellow-owners/shared';
import { getFeed } from '@/api/spaces';
import { useInfiniteCursor } from '@/hooks/use-cursor-list';

export const feedKeys = {
  all: ['feed'] as const,
  space: (handle: string) => [...feedKeys.all, handle] as const,
  community: (handle: string, slug: string) => [...feedKeys.space(handle), slug] as const,
  /** Index 3 is the tab: a post type, or 'all'. */
  list: (handle: string, slug: string, type?: PostType) =>
    [...feedKeys.community(handle, slug), type ?? 'all'] as const,
};

const NO_PREVIEW: LockedPostPreview[] = [];

/**
 * A community feed, newest first, grown with "Load more". The first page also carries the
 * community, the per-type counts for the tabs, and what the viewer may do here. Signed out is a
 * 401 (the API needs a session), so mount it for signed-in viewers only.
 */
export function useFeed(handle: string, slug: string, { type }: { type?: PostType } = {}) {
  const feed = useInfiniteCursor<FeedPage>({
    queryKey: feedKeys.list(handle, slug, type),
    fetchPage: (cursor, signal) =>
      getFeed(handle, slug, { type, cursor: cursor ?? undefined }, signal),
  });
  const first: FeedPage | undefined = feed.pages[0];
  return {
    ...feed,
    community: first?.community,
    counts: first?.counts,
    /** Signed in but not a member of the space: no items, three preview titles, Join CTA. */
    locked: first?.locked ?? false,
    preview: first?.preview ?? NO_PREVIEW,
    /** Posting needs membership of this community, not only of the space. */
    viewerJoinedCommunity: first?.viewerJoinedCommunity ?? false,
  };
}
