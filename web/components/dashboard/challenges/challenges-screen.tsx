'use client';

import type { ChallengeSummary } from '@fellow-owners/shared';
import { Plus, TriangleAlert, Trophy } from 'lucide-react';
import { useState } from 'react';
import { EmptyState } from '@/components/shared/empty-state';
import { Toolbar } from '@/components/shared/toolbar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useChallenges } from '@/hooks/queries/use-challenges';
import { useStudioCommunities } from '@/hooks/queries/use-communities';
import { ApiError } from '@/lib/fetcher';
import { errorMessage } from '@/lib/toast';
import { ChallengeCard } from './challenge-card';
import { NewChallengeSheet } from './new-challenge-sheet';
import { useNow } from './use-now';

const GRID = 'grid gap-4 md:grid-cols-2 xl:grid-cols-3';

/** 404 or 501 from the list means this API does not have challenges yet. */
const notReady = (error: unknown) =>
  error instanceof ApiError && (error.status === 404 || error.status === 501);

const byDue = (a: ChallengeSummary, b: ChallengeSummary) => a.dueAt.localeCompare(b.dueAt);

/**
 * Challenges: the toolbar with the coral New challenge, then open challenges (soonest due first, with
 * their countdown) and closed ones as glass cards. A card opens the challenge.
 */
export function ChallengesScreen() {
  const list = useChallenges();
  const communities = useStudioCommunities();
  const now = useNow();
  const [sheetOpen, setSheetOpen] = useState(false);

  if (list.isError && !list.data) {
    return notReady(list.error) ? (
      <EmptyState
        icon={Trophy}
        title="Challenges are almost here"
        body="This part of your studio is still being set up. Check back soon."
        className="glass min-h-80 rounded-panel"
      />
    ) : (
      <EmptyState
        icon={TriangleAlert}
        tint="peach"
        body={errorMessage(list.error, 'Could not load your challenges.')}
        action={
          <Button variant="secondary" onClick={() => list.refetch()}>
            Try again
          </Button>
        }
        className="glass min-h-80 rounded-panel"
      />
    );
  }
  if (!list.data) {
    return (
      <div aria-busy="true" className="flex flex-col gap-4">
        <span className="sr-only" role="status">
          Loading
        </span>
        <Skeleton className="h-18 rounded-full" />
        <div className={GRID}>
          {[0, 1, 2].map((n) => (
            <Skeleton key={n} className="h-44 rounded-[24px]" />
          ))}
        </div>
      </div>
    );
  }

  const open = list.data.filter((c) => c.status === 'open').sort(byDue);
  const closed = list.data.filter((c) => c.status === 'closed').sort((a, b) => byDue(b, a));
  const section = (id: string, heading: string, items: ChallengeSummary[]) =>
    items.length ? (
      <section aria-labelledby={id} className="flex flex-col gap-3">
        <h2 id={id} className="px-2 text-h2 text-ink">
          {heading}
        </h2>
        <div className={GRID}>
          {items.map((challenge) => (
            <ChallengeCard
              key={challenge.id}
              challenge={challenge}
              communities={communities.data}
              now={now}
            />
          ))}
        </div>
      </section>
    ) : null;

  return (
    <div className="flex flex-col gap-5">
      <Toolbar
        start={
          <Button
            size="md"
            variant={sheetOpen ? 'secondary' : 'primary'}
            surface={sheetOpen ? 'glass' : undefined}
            trailingIcon={<Plus />}
            onClick={() => setSheetOpen(true)}
          >
            New challenge
          </Button>
        }
        end={
          <p className="px-2 text-body text-ink">
            <span className="text-label-strong tabular-nums">{open.length}</span> open,{' '}
            <span className="text-label-strong tabular-nums">{closed.length}</span> closed
          </p>
        }
      />
      {list.data.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="No challenges yet"
          body="Ask your fans for something specific, like the best $10 meal in their city. Then read the AI's shortlist."
          className="glass min-h-72 rounded-panel"
        />
      ) : (
        <>
          {section('open-challenges', 'Open now', open)}
          {section('closed-challenges', 'Closed', closed)}
        </>
      )}
      <NewChallengeSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        communities={communities.data ?? []}
      />
    </div>
  );
}
