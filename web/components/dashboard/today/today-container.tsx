'use client';

import { CirclePause } from 'lucide-react';
import { useMemo } from 'react';
import { Banner } from '@/components/shared/banner';
import { Button } from '@/components/ui/button';
import { useBriefing } from '@/hooks/queries/use-briefing';
import { useTopIdeas } from '@/hooks/queries/use-ideas';
import { useInbox } from '@/hooks/queries/use-inbox';
import { useCommunityActivity } from '@/hooks/queries/use-insights';
import { useOverview } from '@/hooks/queries/use-overview';
import { usePeople } from '@/hooks/queries/use-people';
import { useStudioSpace } from '@/hooks/use-space';
import { errorMessage } from '@/lib/toast';
import { AskCard } from './ask-card';
import { buildDecisionItems, pulseSentence } from './decision-items';
import { DecisionStack, DecisionStackSkeleton } from './decision-stack';
import { FansToThank, FansToThankSkeleton } from './fans-to-thank';
import { MetricsCard } from './metrics-card';
import { PulsePanel, PulsePanelSkeleton } from './pulse-panel';
import { ReportsNotice } from './reports-notice';
import { SetupChecklist } from './setup-checklist';
import { CommunityTiles, CommunityTilesSkeleton, TodayGreeting, TodayView } from './today-view';

/** A failed part: the API's words and a retry, in the part's own footprint. */
function PartError({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <div role="alert" className="glass flex flex-col items-start gap-3 p-5">
      <p className="text-body text-ink">{errorMessage(error, 'This could not be loaded.')}</p>
      <Button variant="secondary" size="md" surface="glass" onClick={retry}>
        Try again
      </Button>
    </div>
  );
}

/**
 * The creator's Today screen (/dashboard). The stack waits for its three sources (briefing, waiting
 * pitches, top ideas) so it never reorders under the creator; a source that fails counts as empty. The
 * right column's parts each run on their own query. The shell sweeps for analysis once per visit.
 */
export function TodayContainer() {
  const overview = useOverview();
  const briefing = useBriefing();
  const inbox = useInbox({ status: 'new', hideSnoozed: true });
  // ponytail: 50 so most briefing picks find their author's face; a miss shows "A fan".
  const ideas = useTopIdeas(50);
  const people = usePeople({}, { urlParam: null });
  const communities = useCommunityActivity(7);
  const space = useStudioSpace();

  const stackReady = !briefing.isPending && !inbox.isLoading && !ideas.isPending;
  const items = useMemo(
    () =>
      stackReady
        ? buildDecisionItems({
            briefing: briefing.data?.highlights ?? [],
            pitches: inbox.items,
            posts: ideas.data ?? [],
          })
        : null,
    [stackReady, briefing.data, inbox.items, ideas.data],
  );

  const data = overview.data;
  const showSetup =
    data && space.data && (data.stats.members.value === 0 || space.data.communityCount === 0);
  const firstName = (space.data?.ownerName || space.data?.displayName || 'there')
    .trim()
    .split(/\s+/)[0];

  return (
    <TodayView
      extras={
        <>
          <AskCard />
          <MetricsCard />
        </>
      }
      banner={
        <>
          {data?.aiPaused ? (
            <Banner icon={CirclePause}>
              AI paused until tomorrow. New items will be read then.
            </Banner>
          ) : null}
          <ReportsNotice />
          {showSetup ? (
            <SetupChecklist
              handle={space.data.handle}
              members={data.stats.members.value}
              communities={space.data.communityCount}
            />
          ) : null}
        </>
      }
      greeting={<TodayGreeting firstName={firstName} count={items ? items.length : null} />}
      stack={items ? <DecisionStack items={items} /> : <DecisionStackSkeleton />}
      pulse={
        overview.isError && communities.isError ? (
          <PartError error={overview.error} retry={() => overview.refetch()} />
        ) : data || communities.data ? (
          <PulsePanel
            sentence={communities.data ? pulseSentence(communities.data.communities) : null}
            stats={data?.stats}
          />
        ) : (
          <PulsePanelSkeleton />
        )
      }
      fans={
        people.data ? (
          <FansToThank fans={people.rising} />
        ) : people.isError ? (
          <PartError error={people.error} retry={people.refetch} />
        ) : (
          <FansToThankSkeleton />
        )
      }
      communities={
        communities.data ? (
          <CommunityTiles communities={communities.data.communities} />
        ) : communities.isError ? (
          <PartError error={communities.error} retry={() => communities.refetch()} />
        ) : (
          <CommunityTilesSkeleton />
        )
      }
    />
  );
}
