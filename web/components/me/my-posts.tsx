import type { PostCard } from '@fellow-owners/shared';
import { Lightbulb } from 'lucide-react';
import Link from 'next/link';
import { FanPostCard } from '@/components/community/post-card';
import { EmptyState } from '@/components/shared/empty-state';
import { buttonVariants } from '@/components/ui/button-variants';
import { routes } from '@/lib/routes';

/** My posts: the fan's own posts as frosted cards (with Loved by Mira), newest first. */
export function MyPosts({
  handle,
  creator,
  posts,
}: {
  handle: string;
  creator: string;
  posts: PostCard[];
}) {
  if (!posts.length) {
    return (
      <EmptyState
        icon={Lightbulb}
        body="You haven't posted yet. Share an idea and see who would use it or count themselves in."
        action={
          <Link
            href={routes.fan.newPost(handle)}
            className={buttonVariants({ variant: 'secondary' })}
          >
            New post
          </Link>
        }
        className="glass min-h-64"
      />
    );
  }
  return (
    <ul className="flex flex-col gap-4">
      {posts.map((post) => (
        <li key={post.id}>
          <FanPostCard
            post={post}
            href={routes.fan.post(handle, post.id)}
            creator={creator}
            showCommunity
          />
        </li>
      ))}
    </ul>
  );
}
