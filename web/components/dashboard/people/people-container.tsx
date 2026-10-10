'use client';

import { RotateCw, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Banner } from '@/components/shared/banner';
import { TableSkeleton } from '@/components/shared/card-skeletons';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useStudioCommunities } from '@/hooks/queries/use-communities';
import { usePeople, useRemovePerson } from '@/hooks/queries/use-people';
import { useUrlState } from '@/hooks/use-url-state';
import { PeopleTabs } from './people-tabs';
import { PeopleView, type PeopleViewMode } from './people-view';

const ALL = 'all';

/** The People screen while its queries load: the Rising card, the toolbar and a table. */
export function PeopleSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-4">
      <span className="sr-only" role="status">
        Loading fans
      </span>
      <Skeleton className="h-40 rounded-panel" />
      <Skeleton className="h-18 rounded-full" />
      <TableSkeleton rows={8} columns={5} />
    </div>
  );
}

/** Wires Fans to the API: ?q=, ?community=, ?view=, ?item=, ?spotlight= and ?page= in the URL, fans paged by cursor. */
export function PeopleContainer({ now }: { now: number }) {
  const { get, set } = useUrlState();
  const urlQ = get('q') ?? '';
  const communities = useStudioCommunities();
  const remove = useRemovePerson();

  // Typing updates the box at once; the URL and the query follow after a pause.
  const [q, setQ] = useState(urlQ);
  useEffect(() => {
    if (q.trim() === urlQ.trim()) return;
    const timer = setTimeout(() => set({ q: q.trim() || null, page: null }), 300);
    return () => clearTimeout(timer);
  }, [q, urlQ, set]);
  // Back, or a link from the header search, changes ?q= under the box.
  useEffect(() => setQ(urlQ), [urlQ]);

  const view: PeopleViewMode = get('view') === 'table' ? 'table' : 'cards';
  const slug = get('community') ?? '';
  const community = communities.data?.some((c) => c.slug === slug) ? slug : ALL;
  const people = usePeople({ q: urlQ, community: community === ALL ? null : community });

  if (people.isError || communities.isError) {
    return (
      <div className="flex flex-col gap-4">
        <PeopleTabs />
        <div role="alert" className="flex flex-col items-start gap-3">
          <Banner>We could not load your fans.</Banner>
          <Button
            variant="secondary"
            icon={<RotateCw />}
            onClick={() => {
              if (people.isError) people.refetch();
              if (communities.isError) void communities.refetch();
            }}
          >
            Try again
          </Button>
        </div>
      </div>
    );
  }
  if (people.isLoading || !people.data || !communities.data) return <PeopleSkeleton />;

  const total = people.total ?? 0;
  // Nobody has joined yet (no search or filter active): the list is empty rather than filtered.
  if (total === 0 && !urlQ.trim() && community === ALL) {
    return (
      <div className="flex flex-col gap-4">
        <PeopleTabs />
        <EmptyState
          icon={Users}
          title="No fans yet"
          body="Share your space link and the fans who join will show up here."
          className="min-h-[536px]"
        />
      </div>
    );
  }

  return (
    <PeopleView
      rows={people.items}
      rising={people.rising}
      total={total}
      communities={communities.data}
      q={q}
      community={community}
      page={people.page}
      pageCount={people.pageCount}
      openId={get('item')}
      spotlightId={get('spotlight')}
      view={view}
      onView={(next) => set({ view: next === 'cards' ? null : next })}
      onSpotlight={(row) =>
        set(
          { spotlight: row?.membershipId ?? null, item: null },
          { push: row !== null && get('spotlight') === null },
        )
      }
      busy={people.isFetching}
      now={now}
      onSearch={setQ}
      onFilter={(value) => set({ community: value === ALL ? null : value, page: null })}
      onPage={people.goTo}
      onOpen={(row) => set({ item: row.membershipId }, { push: get('item') === null })}
      onClose={() => set({ item: null })}
      onRemove={(row) => remove.mutateAsync(row.membershipId)}
    />
  );
}
