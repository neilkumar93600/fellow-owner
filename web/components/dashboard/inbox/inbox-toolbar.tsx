'use client';

import type { InboxSort, PitchStatus } from '@fellow-owners/shared';
import { PITCH_STATUS_LABELS } from '@fellow-owners/shared';
import { LayoutGrid, Rows3 } from 'lucide-react';
import { ExportCsvMenu } from '@/components/dashboard/export-csv-link';
import { SearchSquare, Toolbar } from '@/components/shared/toolbar';
import { cn } from '@/components/ui/cn';
import { Select, type SelectOption } from '@/components/ui/select';
import { formatNumber, pluralize } from '@/lib/format';

/** The statuses the filter offers; withdrawn pitches leave the inbox. */
export const STATUS_FILTERS = [
  'new',
  'shortlisted',
  'replied',
  'archived',
] as const satisfies readonly PitchStatus[];
export type StatusFilter = (typeof STATUS_FILTERS)[number];

const SORT_OPTIONS: readonly SelectOption<InboxSort>[] = [
  { value: 'fit', label: 'Best match' },
  { value: 'newest', label: 'Newest' },
];

const STATUS_OPTIONS: readonly SelectOption<StatusFilter | 'all'>[] = [
  { value: 'all', label: 'All statuses' },
  ...STATUS_FILTERS.map((status) => ({ value: status, label: PITCH_STATUS_LABELS[status] })),
];

export type InboxViewMode = 'cards' | 'table';

export interface InboxToolbarProps {
  /** Messages matching the tab, search and status: announced as it changes. */
  count: number;
  search: string;
  onSearch: (value: string) => void;
  sort: InboxSort;
  onSort: (sort: InboxSort) => void;
  status: StatusFilter | null;
  onStatus: (status: StatusFilter | null) => void;
  view: InboxViewMode;
  onView: (view: InboxViewMode) => void;
}

const VIEWS: ReadonlyArray<{ value: InboxViewMode; label: string; icon: typeof LayoutGrid }> = [
  { value: 'cards', label: 'Cards', icon: LayoutGrid },
  { value: 'table', label: 'Table', icon: Rows3 },
];

/** Cards or Table: two toggle buttons in one frosted pill (aria-pressed carries the state). */
function ViewToggle({ view, onView }: Pick<InboxToolbarProps, 'view' | 'onView'>) {
  return (
    <fieldset className="glass-chip flex h-10 items-center gap-0.5 rounded-full p-0.5">
      <legend className="sr-only">View</legend>
      {VIEWS.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          aria-pressed={view === value}
          onClick={() => onView(value)}
          className={cn(
            'press inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-small-strong',
            view === value ? 'bg-white text-ink shadow-sm' : 'text-ink-soft hover:text-ink',
          )}
        >
          <Icon aria-hidden="true" className="size-4" strokeWidth={1.75} />
          <span className="max-sm:sr-only">{label}</span>
        </button>
      ))}
    </fieldset>
  );
}

/** DESIGN.md Fan mail toolbar: the count on the left; search, Sort, Status, the view toggle and "…" on the right. */
export function InboxToolbar({
  count,
  search,
  onSearch,
  sort,
  onSort,
  status,
  onStatus,
  view,
  onView,
}: InboxToolbarProps) {
  return (
    <Toolbar
      start={
        <p aria-live="polite" className="pl-2 text-label text-ink tabular-nums">
          {formatNumber(count)} {pluralize(count, 'message')}
        </p>
      }
      end={
        // Wraps on a phone, where search, two selects, the toggle and "…" do not fit one line.
        <div className="flex min-w-0 flex-wrap items-center justify-end gap-3 max-sm:justify-start">
          <SearchSquare
            value={search}
            onChange={onSearch}
            label="Search fan mail"
            placeholder="Subject, fan or text"
          />
          <Select
            label="Sort"
            showLabel
            options={SORT_OPTIONS}
            value={sort}
            onValueChange={onSort}
          />
          <Select
            label="Status"
            options={STATUS_OPTIONS}
            value={status ?? 'all'}
            onValueChange={(value) => onStatus(value === 'all' ? null : value)}
          />
          <ViewToggle view={view} onView={onView} />
          <ExportCsvMenu kind="pitches" />
        </div>
      }
    />
  );
}
