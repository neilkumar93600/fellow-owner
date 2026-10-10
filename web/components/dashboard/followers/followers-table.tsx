'use client';

import { type Follower, PLATFORM_LABELS } from '@fellow-owners/shared';
import type * as React from 'react';
import { AvatarInitials } from '@/components/shared/avatar-initials';
import { DataTable, type DataTableColumn } from '@/components/shared/data-table';
import { StatusPill } from '@/components/shared/status-pill';
import { formatRelative } from '@/lib/format';
import { FollowerCommunityChips } from './follower-chips';

/** "@priya.codes · Instagram", or whichever half is known. */
function identity({ handle, platform, email }: Follower): string {
  const parts = [handle ? `@${handle}` : null, platform ? PLATFORM_LABELS[platform] : null];
  const line = parts.filter(Boolean).join(' · ');
  return line || email || '';
}

const CHECKBOX = 'size-5 shrink-0 cursor-pointer accent-ink';

export interface FollowersTableProps {
  rows: Follower[];
  now: number;
  selectedId: string | null;
  /** Ticked rows (any page). */
  picked: string[];
  onPick: (ids: string[], on: boolean) => void;
  hrefFor: (row: Follower) => string;
  onOpen: (row: Follower) => void;
  empty: React.ReactNode;
}

/**
 * The roster: a checkbox to select each row (header box: the whole page), the follower with handle
 * and platform, the note, community chips (AI tags marked), joined, and when they were added.
 */
export function FollowersTable({
  rows,
  now,
  selectedId,
  picked,
  onPick,
  hrefFor,
  onOpen,
  empty,
}: FollowersTableProps) {
  const ids = rows.map((row) => row.id);
  const ticked = ids.filter((id) => picked.includes(id)).length;
  const all = ticked > 0 && ticked === ids.length;

  const columns: DataTableColumn<Follower>[] = [
    {
      key: 'follower',
      header: (
        <span className="inline-flex min-w-44 items-center gap-3">
          <input
            type="checkbox"
            aria-label="Select every follower on this page"
            checked={all}
            ref={(el) => {
              if (el) el.indeterminate = ticked > 0 && !all;
            }}
            onChange={() => onPick(ids, !all)}
            className={CHECKBOX}
          />
          Follower
        </span>
      ),
      primary: true,
      leading: (row) => (
        // Above the stacked row's full-size link on phones, with a 44px target.
        <label className="relative z-10 -m-3 grid size-11 shrink-0 cursor-pointer place-items-center md:m-0 md:size-auto">
          <input
            type="checkbox"
            aria-label={`Select ${row.name}`}
            checked={picked.includes(row.id)}
            onChange={(event) => onPick([row.id], event.target.checked)}
            className={CHECKBOX}
          />
        </label>
      ),
      cell: (row) => (
        <span className="flex items-center gap-3">
          <AvatarInitials name={row.name} size={28} />
          <span className="min-w-0">
            <span className="block truncate">{row.name}</span>
            {identity(row) ? (
              <span className="block truncate text-caption font-normal text-ink-soft">
                {identity(row)}
              </span>
            ) : null}
          </span>
        </span>
      ),
    },
    {
      key: 'note',
      header: 'Note',
      grow: true,
      hideBelow: 'lg',
      cell: (row) =>
        row.note ? (
          <span title={row.note}>{row.note}</span>
        ) : (
          <span className="text-ink-soft">No note</span>
        ),
    },
    {
      key: 'communities',
      header: 'Communities',
      cell: (row) => <FollowerCommunityChips communities={row.communities} max={2} />,
    },
    {
      key: 'joined',
      header: 'Joined',
      hideBelow: 'md',
      cell: (row) =>
        row.joinedAt ? (
          <StatusPill status="joined" label="Joined" tone="cool" />
        ) : (
          <StatusPill status="not-joined" label="Not yet" tone="neutral" />
        ),
    },
    {
      key: 'added',
      header: 'Added',
      hideBelow: 'lg',
      cell: (row) => <span className="text-ink-soft">{formatRelative(row.createdAt, now)}</span>,
    },
  ];

  return (
    <DataTable
      caption="Followers"
      columns={columns}
      rows={rows}
      getRowId={(row) => row.id}
      getRowHref={hrefFor}
      onRowOpen={onOpen}
      selectedId={selectedId}
      empty={empty}
    />
  );
}
