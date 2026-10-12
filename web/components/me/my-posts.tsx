'use client';

import { MY_SPACE_FIRST_PAGE, type PostCard } from '@fellow-owners/shared';
import { Lightbulb } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { FanPostCard } from '@/components/community/post-card';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { buttonVariants } from '@/components/ui/button-variants';
import { useMoreMyPosts } from '@/hooks/queries/use-me';
import { routes } from '@/lib/routes';

/**
 * My posts: the fan's own posts as frosted cards (with Loved by Mira), newest first. My space holds the
 * first MY_SPACE_FIRST_PAGE; Load more appends older ones until a page says there are none left.
 */
export function MyPosts({
  handle,
  creator,
  posts,
}: {
  handle: string;
  creator: string;
  posts: PostCard[];
}) {
  const more = useMoreMyPosts(handle);
  // The last id when a page said nothing older is left (a refetch of My space shows the button again).
  const [doneAfter, setDoneAfter] = useState<string | null>(null);
  const last = posts.at(-1)?.id;

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
    <div className="flex flex-col">
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
      {last && posts.length >= MY_SPACE_FIRST_PAGE && last !== doneAfter ? (
        <Button
          variant="secondary"
          surface="glass"
          className="mt-4 self-center"
          loading={more.isPending}
          onClick={() =>
            more.mutate(last, {
              onSuccess: (page) => {
                if (!page.nextCursor) setDoneAfter(page.items.at(-1)?.id ?? last);
              },
            })
          }
        >
          Load more
        </Button>
      ) : null}
    </div>
  );
}
