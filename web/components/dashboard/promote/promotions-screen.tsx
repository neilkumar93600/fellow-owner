'use client';

import { LayoutGrid, Plus, Table2, TriangleAlert } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { TableSkeleton } from '@/components/shared/card-skeletons';
import { EmptyState } from '@/components/shared/empty-state';
import { Pagination } from '@/components/shared/pagination';
import { SegmentedPill } from '@/components/shared/segmented-pill';
import { Toolbar } from '@/components/shared/toolbar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useStudioCommunities } from '@/hooks/queries/use-communities';
import { usePromotions } from '@/hooks/queries/use-promotions';
import { useUrlEnum } from '@/hooks/use-url-state';
import { formatNumber, pluralize } from '@/lib/format';
import { routes } from '@/lib/routes';
import { errorMessage } from '@/lib/toast';
import { PromotionsList } from './promotions-list';
import { type PromotionsTab, PromotionsTable } from './promotions-table';

const VIEWS = ['cards', 'table'] as const;
const VIEW_OPTIONS = [
  { value: 'cards', label: 'Cards', icon: LayoutGrid },
  { value: 'table', label: 'Table', icon: Table2 },
] as const;

/**
 * The Spotlight list on the promotions query: skeleton, error with retry, then the toolbar (New
 * spotlight, the Cards or Table toggle in ?view=, and "N people opened your spotlights"), the card
 * list or the table, and its pages.
 */
export function PromotionsScreen({ tab }: { tab: PromotionsTab }) {
  const list = usePromotions();
  const communities = useStudioCommunities();
  const [view, setView] = useUrlEnum('view', VIEWS, 'cards');
  // The page's clock, so relative dates are stable between renders.
  const [now] = useState(() => Date.now());

  if (list.isError && !list.data) {
    return (
      <EmptyState
        icon={TriangleAlert}
        tint="peach"
        body={errorMessage(list.error, 'Could not load your spotlights.')}
        action={
          <Button variant="secondary" onClick={() => list.refetch()}>
            Try again
          </Button>
        }
        className="min-h-80"
      />
    );
  }
  if (!list.data || !list.counts) {
    return (
      <div aria-busy="true" className="flex flex-col gap-4">
        <span className="sr-only" role="status">
          Loading
        </span>
        <Skeleton className="h-18 rounded-full" />
        {view === 'table' ? (
          <TableSkeleton rows={6} columns={6} />
        ) : (
          <>
            <Skeleton className="h-36 rounded-[24px]" />
            <Skeleton className="h-36 rounded-[24px]" />
          </>
        )}
      </div>
    );
  }

  const icons = Object.fromEntries((communities.data ?? []).map((c) => [c.slug, c.icon]));
  const opened = list.totalClicks ?? 0;
  return (
    <>
      <Toolbar
        start={
          <Button
            variant="secondary"
            surface="glass"
            size="md"
            trailingIcon={<Plus />}
            render={<Link href={routes.dashboard.ideas()} />}
          >
            New spotlight
          </Button>
        }
        end={
          <div className="flex flex-wrap items-center justify-end gap-3">
            <p className="basis-full px-2 text-body text-ink sm:basis-auto">
              <span className="text-label-strong tabular-nums">{formatNumber(opened)}</span>{' '}
              {pluralize(opened, 'person', 'people')} opened your spotlights,{' '}
              <span className="tabular-nums">{formatNumber(list.counts.live)}</span> live
            </p>
            <SegmentedPill
              label="Spotlight view"
              options={VIEW_OPTIONS}
              value={view}
              onChange={setView}
            />
          </div>
        }
      />
      {view === 'table' ? (
        <PromotionsTable items={list.items} tab={tab} icons={icons} now={now} />
      ) : (
        <PromotionsList items={list.items} tab={tab} icons={icons} now={now} />
      )}
      <Pagination
        page={list.page}
        pageCount={list.pageCount}
        onPageChange={list.goTo}
        label="Spotlight pages"
        className="self-center"
      />
    </>
  );
}
