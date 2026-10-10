'use client';

import type {
  ChallengeSummary,
  FeedPage,
  LockedPostPreview,
  PostCard,
  PostType,
  PublicCommunity,
} from '@fellow-owners/shared';
import { POST_TYPE_LABELS, POST_TYPE_PLURAL_LABELS, POST_TYPES } from '@fellow-owners/shared';
import { Lightbulb, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { IdeaCardSkeleton } from '@/components/shared/card-skeletons';
import { EmptyState } from '@/components/shared/empty-state';
import { GlassPanel } from '@/components/shared/glass-panel';
import { TabBar } from '@/components/shared/tab-bar';
import { Button } from '@/components/ui/button';
import { buttonVariants } from '@/components/ui/button-variants';
import { Skeleton } from '@/components/ui/skeleton';
import { routes } from '@/lib/routes';
import { ChallengeCard } from './challenge-card';
import { acceptsEntries } from './challenge-time.mjs';
import { CommunityHeader } from './community-header';
import { LoadError } from './load-error';
import { NewPostFab } from './new-post-fab';
import { FanPostCard } from './post-card';

export interface CommunityFeedProps {
  handle: string;
  /** The creator's first name, for "Loved by Mira". */
  creator?: string;
  /** The space's challenges (any room); this feed shows the ones that apply to its community. */
  challenges?: ChallengeSummary[];
  /** The feed so far: every page loaded (items already of `type`), and what the viewer may do here. */
  feed: Pick<FeedPage, 'community' | 'items' | 'locked' | 'preview' | 'viewerJoinedCommunity'>;
  /** The tab, from ?type= (Ideas when absent). */
  type: PostType;
  /** The first page is on its way: the header and tabs show, the list is skeletons. */
  loading?: boolean;
  /** A read failed (the first page, or a Load more): the reason and what Try again runs. */
  failure?: { error: unknown; retry: () => void } | null;
  /** More posts wait behind Load more. */
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
  /** Joins the community; null while the viewer's membership is unknown. */
  onJoin: (() => void) | null;
  joining?: boolean;
}

/**
 * /{handle}/c/{slug}: the cover header, an open challenge pinned on top, the Ideas, Fan projects and
 * Discussions tab bar, a one-time tip, then frosted post cards in one column with Load more. The
 * screen's one coral action is Enter the challenge while one is open, else New post (in the header from
 * 640px, a floating pill on phones). A visitor who is not a member gets the first three titles and Join
 * to see everything.
 */
export function CommunityFeed({
  handle,
  creator = 'the creator',
  challenges = [],
  feed,
  type,
  loading = false,
  failure = null,
  hasMore = false,
  loadingMore = false,
  onLoadMore,
  onJoin,
  joining,
}: CommunityFeedProps) {
  const { community, locked } = feed;
  const newPostHref = routes.fan.newPost(handle, {
    community: community.slug,
    type: type === 'idea' ? undefined : type,
  });
  const tabs = POST_TYPES.map((value) => ({
    href: routes.fan.community(handle, community.slug, value === 'idea' ? {} : { type: value }),
    label: POST_TYPE_PLURAL_LABELS[value],
    active: value === type,
  }));

  // Challenges for this room (or for every room): open ones first, then the latest closed one.
  const here = challenges.filter((c) => c.communityId === null || c.communityId === community.id);
  const open = here.filter((c) => acceptsEntries(c));
  // A closed challenge stays pinned only while it has a shortlist worth reading.
  const closed = here.filter((c) => !acceptsEntries(c) && c.shortlist?.length).slice(0, 1);
  const pinned = locked ? [] : [...open.slice(0, 2), ...closed];
  const challengeOpen = open.length > 0 && feed.viewerJoinedCommunity;

  return (
    <div className="flex flex-col gap-4">
      <CommunityHeader
        community={community}
        joined={feed.viewerJoinedCommunity}
        newPostHref={locked ? null : newPostHref}
        newPostPrimary={!challengeOpen}
        onJoin={onJoin}
        joining={joining}
        loading={loading}
      />
      {locked ? (
        <LockedPreview handle={handle} community={community} preview={feed.preview} />
      ) : (
        <>
          {pinned.map((challenge) => (
            <ChallengeCard
              key={challenge.id}
              handle={handle}
              challenge={challenge}
              primary={challengeOpen && challenge.id === open[0]?.id}
            />
          ))}
          <TabBar label={`${community.name} posts`} tabs={tabs} />
          {loading ? (
            <FeedListSkeleton />
          ) : failure && !feed.items.length ? (
            <LoadError error={failure.error} onRetry={failure.retry} />
          ) : (
            <>
              <TipCard />
              <PostList
                key={type}
                handle={handle}
                creator={creator}
                posts={feed.items}
                type={type}
                hasMore={hasMore}
                loadingMore={loadingMore}
                onLoadMore={onLoadMore}
                failure={failure}
              />
              <NewPostFab href={newPostHref} primary={!challengeOpen} />
            </>
          )}
        </>
      )}
    </div>
  );
}

/** The list while the first page loads: three fan cards. */
function FeedListSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-4">
      <span className="sr-only" role="status">
        Loading posts
      </span>
      {['first', 'second', 'third'].map((key) => (
        <IdeaCardSkeleton key={key} variant="fan" />
      ))}
    </div>
  );
}

/** The whole screen while the route streams in (loading.tsx): cover header, tab bar and the cards. */
export function CommunityFeedSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-4">
      <span className="sr-only" role="status">
        Loading community
      </span>
      <Skeleton className="h-64 rounded-panel" />
      <Skeleton className="h-16" />
      {['first', 'second', 'third'].map((key) => (
        <IdeaCardSkeleton key={key} variant="fan" />
      ))}
    </div>
  );
}

/** The first-visit tip; dismissed for this visit (persisting it comes with the data layer). */
function TipCard() {
  const [open, setOpen] = useState(true);
  if (!open) return null;
  return (
    <GlassPanel
      as="aside"
      strength="strong"
      aria-label="Tip"
      className="flex items-center gap-3 p-3 pl-4"
    >
      <span
        aria-hidden="true"
        className="grid size-10 shrink-0 place-items-center rounded-2xl bg-aurora-lilac"
      >
        <Lightbulb strokeWidth={1.5} className="size-5 text-[#5b47a8]" />
      </span>
      <p className="min-w-0 flex-1 text-body text-ink">
        Share an idea, or tap <strong className="font-semibold">Count me in</strong> on something
        you like.
      </p>
      <Button
        variant="ghost"
        size="icon-fan"
        surface="glass"
        aria-label="Dismiss tip"
        onClick={() => {
          setOpen(false);
          // The button leaves with the tip, so focus moves on to the list.
          document.getElementById('feed-title')?.focus();
        }}
      >
        <X />
      </Button>
    </GlassPanel>
  );
}

function PostList({
  handle,
  creator,
  posts,
  type,
  hasMore,
  loadingMore,
  onLoadMore,
  failure,
}: {
  handle: string;
  creator: string;
  posts: PostCard[];
  type: PostType;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore?: () => void;
  failure: { error: unknown; retry: () => void } | null;
}) {
  const listRef = useRef<HTMLUListElement>(null);
  const focusFrom = useRef<number | null>(null);
  const label = POST_TYPE_PLURAL_LABELS[type];

  // Keyboard users carry on from the first new card instead of the end of the page.
  useEffect(() => {
    const first = focusFrom.current;
    if (first === null || posts.length <= first) return;
    focusFrom.current = null;
    listRef.current?.querySelectorAll<HTMLElement>('h3 a')[first]?.focus();
  }, [posts.length]);

  function loadMore() {
    focusFrom.current = posts.length;
    onLoadMore?.();
  }

  return (
    <section aria-labelledby="feed-title" className="flex flex-col">
      <h2 id="feed-title" tabIndex={-1} className="sr-only">
        {label}
      </h2>
      {posts.length ? (
        <ul ref={listRef} className="flex flex-col gap-4">
          {posts.map((post) => (
            <li key={post.id}>
              <FanPostCard post={post} href={routes.fan.post(handle, post.id)} creator={creator} />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={Lightbulb}
          body={`No ${label.toLowerCase()} here yet. Start one with New post.`}
          className="glass min-h-64"
        />
      )}
      {failure ? (
        <div className="mt-4">
          <LoadError error={failure.error} onRetry={failure.retry} />
        </div>
      ) : hasMore ? (
        <Button
          variant="secondary"
          surface="glass"
          className="mt-4 self-center"
          loading={loadingMore}
          onClick={loadMore}
        >
          Load more
        </Button>
      ) : null}
    </section>
  );
}

/** Non-members: three real titles, then quiet placeholder rows (no blur) and the way in. */
function LockedPreview({
  handle,
  community,
  preview,
}: {
  handle: string;
  community: PublicCommunity;
  preview: LockedPostPreview[];
}) {
  const joinHref = routes.fan.join(handle, routes.fan.community(handle, community.slug));
  return (
    <section aria-labelledby="preview-title" className="flex flex-col gap-4">
      <h2 id="preview-title" className="font-display text-[1.75rem] leading-[1.15] text-ink">
        A look inside {community.name}
      </h2>
      <ul className="flex flex-col gap-4">
        {preview.slice(0, 3).map((item) => (
          <li key={item.id} className="glass p-5">
            <p className="text-small text-ink-soft">{POST_TYPE_LABELS[item.type]}</p>
            <p className="mt-1 line-clamp-2 text-h2 text-ink">{item.title}</p>
          </li>
        ))}
      </ul>
      <div aria-hidden="true" className="flex flex-col gap-4">
        {['w-3/4', 'w-2/3', 'w-4/5'].map((width) => (
          <div key={width} className="glass p-5">
            <div className="h-3.5 w-14 rounded-full bg-ink/10" />
            <div className={`mt-3 h-5 rounded-full bg-ink/10 ${width}`} />
            <div className="mt-2 h-5 w-2/5 rounded-full bg-ink/10" />
          </div>
        ))}
      </div>
      <GlassPanel strength="strong" className="flex flex-col items-center gap-4 p-6 text-center">
        <p className="max-w-[48ch] text-body text-ink">
          Join {community.name} to read every post, back the ideas you like and join a crew.
        </p>
        <Link href={joinHref} className={buttonVariants({ variant: 'primary' })}>
          Join to see everything
        </Link>
      </GlassPanel>
    </section>
  );
}
