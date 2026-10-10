'use client';

import type { PublicCommunity } from '@fellow-owners/shared';
import { Check, Plus } from 'lucide-react';
import Link from 'next/link';
import { CommunityCover } from '@/components/bio/community-cover';
import { Button } from '@/components/ui/button';
import { buttonVariants } from '@/components/ui/button-variants';
import { cn } from '@/components/ui/cn';
import { Skeleton } from '@/components/ui/skeleton';
import { formatNumber, pluralize } from '@/lib/format';

export interface CommunityHeaderProps {
  community: PublicCommunity;
  /** FeedPage.viewerJoinedCommunity */
  joined: boolean;
  /** The desktop New post (phones get the floating pill instead). Null hides the actions (locked). */
  newPostHref: string | null;
  /** New post is the page's coral action; with an open challenge it steps aside for Enter the challenge. */
  newPostPrimary?: boolean;
  /** Joins this community; the Join button is disabled (null) until the viewer's membership is known. */
  onJoin: (() => void) | null;
  /** The join is being saved. */
  joining?: boolean;
  /** The feed has not said yet whether the viewer may act here: holds the actions row's place. */
  loading?: boolean;
}

/**
 * The header of a community feed: the room's cover photo, then a frosted panel that overlaps it with the
 * name (the page's h1, Instrument Serif), the fan count and description, then Joined (or Join) and, from
 * 640px, New post.
 */
export function CommunityHeader({
  community,
  joined,
  newPostHref,
  newPostPrimary = true,
  onJoin,
  joining = false,
  loading = false,
}: CommunityHeaderProps) {
  const fans = community.memberCount;

  return (
    <section aria-labelledby="community-title" className="flex flex-col">
      <div className="glass relative h-36 overflow-hidden sm:h-52">
        <CommunityCover
          slug={community.slug}
          name={community.name}
          tint={community.tint}
          icon={community.icon}
          sizes="(min-width: 840px) 792px, 100vw"
        />
      </div>
      <div className="glass-strong relative z-10 -mt-10 flex flex-col gap-3 p-5 sm:mx-6 sm:p-6">
        <div className="flex flex-col gap-1">
          <h1
            id="community-title"
            className="font-display text-[2rem] leading-[1.1] font-normal text-ink sm:text-[2.5rem]"
          >
            {community.name}
          </h1>
          <p className="text-small text-ink-soft">
            <span className="tabular-nums">{formatNumber(fans)}</span> {pluralize(fans, 'fan')}
          </p>
        </div>
        {community.description ? (
          <p className="max-w-[68ch] text-body text-ink">{community.description}</p>
        ) : null}
        {loading ? (
          <div aria-hidden="true" className="flex h-12 items-center">
            <Skeleton className="h-6 w-20" />
          </div>
        ) : newPostHref ? (
          <div className="flex flex-wrap items-center gap-3">
            {joined ? (
              <span className="inline-flex h-11 items-center gap-2 text-label text-ink">
                <Check aria-hidden="true" strokeWidth={1.5} className="size-5" />
                Joined
              </span>
            ) : (
              <Button
                variant="secondary"
                surface="glass"
                className="h-11"
                disabled={!onJoin}
                loading={joining}
                onClick={onJoin ?? undefined}
              >
                Join<span className="sr-only"> {community.name}</span>
              </Button>
            )}
            <Link
              href={newPostHref}
              className={cn(
                buttonVariants({ variant: newPostPrimary ? 'primary' : 'secondary' }),
                'ml-auto max-sm:hidden',
              )}
            >
              <Plus aria-hidden="true" className="size-5" />
              New post
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  );
}
