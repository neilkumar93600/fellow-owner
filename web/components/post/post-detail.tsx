'use client';

import type { PostDetail } from '@fellow-owners/shared';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { LoadError } from '@/components/community/load-error';
import { useMemberRedirect } from '@/components/community/use-member-redirect';
import { Skeleton } from '@/components/ui/skeleton';
import { usePost } from '@/hooks/queries/use-post';
import { useMembership } from '@/hooks/use-membership';
import { ApiError } from '@/lib/fetcher';
import { routes } from '@/lib/routes';
import { CommentThread } from './comment-thread';
import { PostBody } from './post-body';
import { SimilarSection } from './similar-section';

/** /{handle}/p/{postId}: back to the community, the post card, then the comments card. */
export function PostDetailView({ handle, post }: { handle: string; post: PostDetail }) {
  return (
    <div className="flex flex-col gap-5">
      <Link
        href={routes.fan.community(handle, post.community.slug)}
        className="press -ml-3 inline-flex h-11 w-fit items-center gap-2 rounded-full px-3 text-label text-ink hover:bg-white/60"
      >
        <ArrowLeft aria-hidden="true" strokeWidth={1.5} className="size-5" />
        Back to {post.community.name}
      </Link>
      <PostBody handle={handle} post={post} />
      <CommentThread handle={handle} postId={post.id} comments={post.comments} />
      <SimilarSection postId={post.id} scope="member" />
    </div>
  );
}

/** The post screen while its read loads: the back link, the post card and the comments card. */
export function PostDetailSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-5">
      <span className="sr-only" role="status">
        Loading post
      </span>
      <Skeleton className="h-11 w-48" />
      <div className="glass-strong p-6 sm:p-8">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="mt-4 h-8 w-4/5" />
        <div className="mt-4 flex items-center gap-3">
          <Skeleton className="size-10" />
          <Skeleton className="h-4 w-44" />
        </div>
        <div className="mt-6 flex flex-col gap-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        <div className="mt-6 flex gap-3 border-t border-ink/10 pt-6">
          <Skeleton className="h-11 w-36" />
          <Skeleton className="h-11 w-44" />
        </div>
      </div>
      <Skeleton className="h-48 rounded-panel" />
    </div>
  );
}

/**
 * Wires the post screen to the API. Fans only: a visitor who is not in the space goes to Join and comes
 * back here; an unknown, deleted or hidden post is the 404 page.
 */
export function PostDetailContainer({ handle, postId }: { handle: string; postId: string }) {
  const post = usePost(postId);
  // Primed here so a comment sent at once shows under the viewer's own name.
  useMembership(handle);
  const redirecting = useMemberRedirect(handle, post.error, routes.fan.post(handle, postId));

  if (post.error instanceof ApiError && post.error.status === 404) notFound();
  if (post.isError && !redirecting) {
    return <LoadError error={post.error} onRetry={() => void post.refetch()} />;
  }
  if (!post.data) return <PostDetailSkeleton />;
  return <PostDetailView handle={handle} post={post.data} />;
}
