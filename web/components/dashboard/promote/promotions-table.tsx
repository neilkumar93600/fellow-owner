'use client';

import {
  type CommunityIcon,
  PLATFORM_LABELS,
  PROMOTION_PLATFORMS,
  type Promotion,
  type PromotionState,
} from '@fellow-owners/shared';
import { Megaphone } from 'lucide-react';
import Link from 'next/link';
import { CommunityChip } from '@/components/shared/community-chip';
import { DataTable, type DataTableColumn } from '@/components/shared/data-table';
import { EmptyState } from '@/components/shared/empty-state';
import { StatusPill } from '@/components/shared/status-pill';
import { buttonVariants } from '@/components/ui/button-variants';
import { formatNumber, formatRelative, pluralize } from '@/lib/format';
import { routes } from '@/lib/routes';
import { PromotionMenu } from './promotion-menu';

/** ?tab= on /dashboard/promote. */
export type PromotionsTab = 'all' | 'live' | 'drafts' | 'unpublished';

export const TAB_STATE: Record<PromotionsTab, PromotionState | null> = {
  all: null,
  live: 'live',
  drafts: 'draft',
  unpublished: 'unpublished',
};

export const EMPTY: Record<PromotionsTab, string> = {
  all: 'Nothing in your spotlight yet. Give a fan idea your spotlight from the Ideas screen.',
  live: 'Nothing is live. Give a fan idea your spotlight from the Ideas screen.',
  drafts: 'No drafts waiting. Give a fan idea your spotlight from the Ideas screen to start one.',
  unpublished: 'Nothing taken down. Spotlights you take down land here.',
};

export function dateLine(p: Promotion, now: number): string {
  if (p.state === 'live' && p.publishedAt) return `Published ${formatRelative(p.publishedAt, now)}`;
  if (p.state === 'unpublished' && p.unpublishedAt)
    return `Taken down ${formatRelative(p.unpublishedAt, now)}`;
  return `Edited ${formatRelative(p.updatedAt, now)}`;
}

export function draftedFor(p: Promotion): string {
  const platforms = PROMOTION_PLATFORMS.filter((key) => p.drafts[key]?.text.trim());
  return platforms.map((key) => PLATFORM_LABELS[key]).join(', ') || 'None yet';
}

/** The empty state of any promotions view, with a way to start one unless the tab is "taken down". */
export function PromotionsEmpty({ tab }: { tab: PromotionsTab }) {
  return (
    <EmptyState
      icon={Megaphone}
      body={EMPTY[tab]}
      action={
        tab === 'unpublished' ? undefined : (
          <Link
            href={routes.dashboard.ideas()}
            className={buttonVariants({ variant: 'secondary' })}
          >
            Open Ideas
          </Link>
        )
      }
      className="min-h-80"
    />
  );
}

export interface PromotionsTableProps {
  /** This page's promotions, newest first. */
  items: Promotion[];
  tab: PromotionsTab;
  /** Community icons by slug: promotion rows carry slug, name and tint only. */
  icons: Record<string, CommunityIcon>;
  /** The page's clock, so relative dates hydrate the same on server and client. */
  now: number;
}

/**
 * The "Table" view of the Spotlight list (the card list is the default): a status column, how many
 * opened each one, and a row menu (open, copy the link, take it down). The tab filters the page shown;
 * the API pages every state together. The toolbar lives in the screen, shared with the card view.
 */
export function PromotionsTable({ items, tab, icons, now }: PromotionsTableProps) {
  const state = TAB_STATE[tab];
  const rows = state ? items.filter((p) => p.state === state) : items;

  const columns: DataTableColumn<Promotion>[] = [
    { key: 'post', header: 'Idea', primary: true, grow: true, cell: (row) => row.post.title },
    {
      key: 'community',
      header: 'Community',
      cell: (row) => (
        <CommunityChip
          name={row.post.community.name}
          tint={row.post.community.tint}
          icon={icons[row.post.community.slug] ?? 'users'}
          className="max-w-40"
        />
      ),
    },
    { key: 'status', header: 'Status', cell: (row) => <StatusPill status={row.state} /> },
    {
      key: 'platforms',
      header: 'Drafted for',
      hideBelow: 'lg',
      cell: (row) => <span className="text-ink-soft">{draftedFor(row)}</span>,
    },
    {
      key: 'clicks',
      header: 'Opened by',
      align: 'end',
      cell: (row) => (
        <span className="tabular-nums">
          {formatNumber(row.clickCount)}
          <span className="md:sr-only"> {pluralize(row.clickCount, 'person', 'people')}</span>
        </span>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      hideBelow: 'lg',
      cell: (row) => <span className="text-ink-soft">{dateLine(row, now)}</span>,
    },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      hideBelow: 'md',
      align: 'end',
      width: '64px',
      cell: (row) => <PromotionMenu promotion={row} />,
    },
  ];

  return (
    <DataTable
      caption="Spotlights"
      columns={columns}
      rows={rows}
      getRowId={(row) => row.id}
      getRowHref={(row) => routes.dashboard.promoteComposer(row.postId)}
      empty={<PromotionsEmpty tab={tab} />}
    />
  );
}
