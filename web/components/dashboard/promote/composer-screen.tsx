'use client';

import type { PromotionPlatform } from '@fellow-owners/shared';
import { Megaphone, Sparkles, TriangleAlert } from 'lucide-react';
import Link from 'next/link';
import { CommunityChip } from '@/components/shared/community-chip';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { buttonVariants } from '@/components/ui/button-variants';
import { Skeleton } from '@/components/ui/skeleton';
import { useCreatePromotion, usePromotionComposer } from '@/hooks/queries/use-promotions';
import { useStudioSpace } from '@/hooks/use-space';
import { ApiError } from '@/lib/fetcher';
import { routes } from '@/lib/routes';
import { errorMessage } from '@/lib/toast';
import { PromoteComposer } from './promote-composer';

/**
 * The composer on its queries: skeleton while the post and space load, an error with retry (or a plain
 * "not found"), a Promote step when the post has no promotion yet, then the composer itself.
 */
export function ComposerScreen({
  postId,
  platform,
  headlineSeed = '',
}: {
  postId: string;
  platform: PromotionPlatform;
  /** ?title= from What fans want: the headline field starts with it. */
  headlineSeed?: string;
}) {
  const composer = usePromotionComposer(postId);
  const space = useStudioSpace();
  const create = useCreatePromotion();

  if (composer.error instanceof ApiError && composer.error.status === 404) {
    return (
      <EmptyState
        icon={Megaphone}
        body="This post was not found in your space."
        action={
          <Link
            href={routes.dashboard.promote()}
            className={buttonVariants({ variant: 'secondary' })}
          >
            Back to Spotlight
          </Link>
        }
        className="min-h-80"
      />
    );
  }
  const failed = composer.isError || space.isError;
  if (failed && !(composer.data && space.data)) {
    return (
      <EmptyState
        icon={TriangleAlert}
        tint="peach"
        body={errorMessage(composer.error ?? space.error, 'Could not load the composer.')}
        action={
          <Button
            variant="secondary"
            onClick={() => {
              void composer.refetch();
              void space.refetch();
            }}
          >
            Try again
          </Button>
        }
        className="min-h-80"
      />
    );
  }
  if (!composer.data || !space.data) {
    return (
      <div aria-busy="true" className="grid grid-cols-12 gap-5">
        <span className="sr-only" role="status">
          Loading
        </span>
        <Skeleton className="col-span-12 h-96 rounded-panel @4xl:col-span-7" />
        <Skeleton className="col-span-12 h-96 rounded-panel @4xl:col-span-5" />
      </div>
    );
  }

  const { post, promotion } = composer.data;
  if (!promotion) {
    return (
      <section aria-labelledby="post-title" className="glass-strong rounded-panel p-6">
        <h1 className="sr-only">Give {post.title} your spotlight</h1>
        <CommunityChip
          name={post.community.name}
          tint={post.community.tint}
          icon={post.community.icon}
        />
        <h2 id="post-title" className="mt-3 text-h2 text-ink">
          {post.title}
        </h2>
        <p className="mt-2 max-w-[68ch] text-body text-ink-soft">
          The AI drafts a post for X, Instagram, LinkedIn and YouTube in your voice. You edit every
          word, then publish a page that credits the fans who made it, and a link that shows how it
          landed.
        </p>
        <Button
          className="mt-5"
          icon={<Sparkles />}
          loading={create.isPending}
          disabled={create.isPending}
          onClick={() => create.mutate(post.id)}
        >
          Draft my spotlight
        </Button>
        <p role="status" className="sr-only">
          {create.isPending ? 'Drafting your spotlight' : ''}
        </p>
      </section>
    );
  }
  return (
    <PromoteComposer
      composer={{ post, promotion }}
      space={space.data}
      platform={platform}
      headlineSeed={headlineSeed}
    />
  );
}
