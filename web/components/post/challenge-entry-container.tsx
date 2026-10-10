'use client';

import { Trophy } from 'lucide-react';
import Link from 'next/link';
import { LoadError } from '@/components/community/load-error';
import { useMemberRedirect } from '@/components/community/use-member-redirect';
import { useSpaceChallenges } from '@/components/community/use-space-challenges';
import { EmptyState } from '@/components/shared/empty-state';
import { buttonVariants } from '@/components/ui/button-variants';
import { Skeleton } from '@/components/ui/skeleton';
import { useMe } from '@/hooks/queries/use-me';
import { routes, withQuery } from '@/lib/routes';
import { ChallengeEntryForm } from './challenge-entry-form';

/**
 * Wires /{handle}/new?challenge=ID: the challenge comes from the space's challenge list (there is no
 * single-challenge read for fans), and a visitor who is not in the space goes to Join first and comes
 * back here. An id the list does not hold (wrong link, or the API has no challenges yet) is a plain
 * "can't find it" with a way back.
 */
export function ChallengeEntryContainer({
  handle,
  challengeId,
}: {
  handle: string;
  challengeId: string;
}) {
  const me = useMe(handle);
  const challenges = useSpaceChallenges(handle);
  const redirecting = useMemberRedirect(
    handle,
    me.error,
    withQuery(routes.fan.newPost(handle), { challenge: challengeId }),
  );

  if (me.isError && !redirecting) {
    return <LoadError error={me.error} onRetry={() => void me.refetch()} />;
  }
  if (challenges.isError) {
    return <LoadError error={challenges.error} onRetry={() => void challenges.refetch()} />;
  }
  if (!me.data || !challenges.data) {
    return (
      <div aria-busy="true" className="flex flex-col gap-4">
        <span className="sr-only" role="status">
          Loading the challenge
        </span>
        <Skeleton className="h-28 rounded-panel" />
        <Skeleton className="h-96 rounded-panel" />
      </div>
    );
  }

  const challenge = challenges.data.find((item) => item.id === challengeId);
  if (!challenge) {
    return (
      <EmptyState
        icon={Trophy}
        className="glass-strong min-h-64"
        body="We can’t find that challenge. It may have been removed, or the link is old."
        action={
          <Link
            href={routes.fan.space(handle)}
            className={buttonVariants({ variant: 'secondary' })}
          >
            Back to the space
          </Link>
        }
      />
    );
  }
  return <ChallengeEntryForm handle={handle} challenge={challenge} />;
}
