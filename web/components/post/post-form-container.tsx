'use client';

import type { PostType } from '@fellow-owners/shared';
import { Users } from 'lucide-react';
import Link from 'next/link';
import { LoadError } from '@/components/community/load-error';
import { useMemberRedirect } from '@/components/community/use-member-redirect';
import { EmptyState } from '@/components/shared/empty-state';
import { buttonVariants } from '@/components/ui/button-variants';
import { Skeleton } from '@/components/ui/skeleton';
import { useMe } from '@/hooks/queries/use-me';
import { routes } from '@/lib/routes';
import { PostForm } from './post-form';

/** The form card while the viewer's communities and today's post allowance load. */
export function PostFormSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-6 glass-strong p-6 sm:p-8">
      <span className="sr-only" role="status">
        Loading the form
      </span>
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-48 w-full rounded-2xl" />
    </div>
  );
}

/**
 * Wires New post to the API: the communities the viewer has joined (a post goes to one of them) and how
 * many posts are left today come from My space. A visitor who is not a member goes to Join first and
 * comes back here.
 */
export function PostFormContainer({
  handle,
  community,
  type,
}: {
  handle: string;
  /** ?community= slug to preselect. */
  community?: string;
  type?: PostType;
}) {
  const me = useMe(handle);
  const redirecting = useMemberRedirect(
    handle,
    me.error,
    routes.fan.newPost(handle, { community, type }),
  );

  if (me.isError && !redirecting) {
    return <LoadError error={me.error} onRetry={() => void me.refetch()} />;
  }
  if (!me.data) return <PostFormSkeleton />;

  const { communities, caps } = me.data;
  if (!communities.length) {
    return (
      <EmptyState
        icon={Users}
        body="Join a room to start posting in it."
        className="glass-strong min-h-64"
        action={
          <Link
            href={routes.fan.join(handle, routes.fan.newPost(handle, { type }))}
            className={buttonVariants({ variant: 'primary' })}
          >
            Join a community
          </Link>
        }
      />
    );
  }

  return (
    <PostForm
      handle={handle}
      communities={communities}
      defaultCommunityId={communities.find((item) => item.slug === community)?.id}
      defaultType={type}
      postsLeftToday={caps.postsLeftToday}
      coach={{ creatorName: me.data.space.displayName.split(' ')[0] ?? 'the creator' }}
    />
  );
}
