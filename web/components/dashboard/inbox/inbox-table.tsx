import { type InboxItem, PITCH_TYPE_LABELS } from '@fellow-owners/shared';
import { ArchiveRestore, Eye } from 'lucide-react';
import type * as React from 'react';
import { AiChip } from '@/components/shared/ai-chip';
import { AvatarInitials } from '@/components/shared/avatar-initials';
import { DataTable, type DataTableColumn } from '@/components/shared/data-table';
import { FitPill } from '@/components/shared/fit-pill';
import { StatusPill } from '@/components/shared/status-pill';
import { Button } from '@/components/ui/button';
import { formatRelative } from '@/lib/format';

export interface InboxTableProps {
  rows: InboxItem[];
  /** The message whose side panel is open. */
  selectedId: string | null;
  /** The row's own URL (?item=), so the sender link works in a new tab and as the keyboard path. */
  hrefFor: (item: InboxItem) => string;
  onOpen: (item: InboxItem) => void;
  onRetry: (item: InboxItem) => void;
  onRestore: (item: InboxItem) => void;
  /** One clock for server and client, so relative dates hydrate unchanged. */
  now: number;
  empty: React.ReactNode;
}

/** A message's AI line: the summary, the shimmering chip while it is analyzed, or Retry once it failed. */
function AiSummary({ item, onRetry }: { item: InboxItem; onRetry: () => void }) {
  if (item.ai.status === 'pending') return <AiChip kind="reviewing" />;
  if (item.ai.status === 'failed') return <AiChip kind="not-analyzed" onRetry={onRetry} />;
  return <span className="text-ink-muted">{item.ai.summary ?? item.excerpt}</span>;
}

/**
 * DESIGN.md Fan mail table (the "Table" view): sender (avatar and the link into the side panel), type, the
 * one-line summary, match, status, date and the eye. Kept-out messages carry their reason as the summary
 * and a Restore action. Below 768px rows stack: sender, then match and status, then a chevron.
 */
export function InboxTable({
  rows,
  selectedId,
  hrefFor,
  onOpen,
  onRetry,
  onRestore,
  now,
  empty,
}: InboxTableProps) {
  const columns: DataTableColumn<InboxItem>[] = [
    {
      key: 'sender',
      header: 'Sender',
      primary: true,
      leading: (item) => (
        <AvatarInitials name={item.sender.name} image={item.sender.image} size={28} />
      ),
      cell: (item) => item.sender.name,
    },
    {
      key: 'type',
      header: 'Type',
      hideBelow: 'lg',
      cell: (item) => <span className="text-ink-muted">{PITCH_TYPE_LABELS[item.type]}</span>,
    },
    {
      key: 'summary',
      header: 'Summary',
      grow: true,
      hideBelow: 'lg',
      cell: (item) => <AiSummary item={item} onRetry={() => onRetry(item)} />,
    },
    {
      key: 'fit',
      header: 'Match',
      cell: (item) =>
        item.ai.status === 'done' && item.ai.fitScore != null && item.ai.fitReason ? (
          <FitPill score={item.ai.fitScore} reason={item.ai.fitReason} />
        ) : null,
    },
    {
      key: 'status',
      header: 'Status',
      cell: (item) => <StatusPill status={item.isFiltered ? 'filtered' : item.status} />,
    },
    {
      key: 'date',
      header: 'Date',
      hideBelow: 'lg',
      cell: (item) => <span className="text-ink-muted">{formatRelative(item.createdAt, now)}</span>,
    },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      hideBelow: 'md',
      align: 'end',
      cell: (item) => (
        <span className="inline-flex gap-1">
          {item.isFiltered ? (
            <Button
              variant="ghost"
              surface="white"
              className="text-ink-soft"
              aria-label={`Restore the message from ${item.sender.name}`}
              onClick={() => onRestore(item)}
            >
              <ArchiveRestore />
            </Button>
          ) : null}
          <Button
            variant="ghost"
            surface="white"
            className="text-ink-soft"
            aria-label={`Open the message from ${item.sender.name}`}
            onClick={() => onOpen(item)}
          >
            <Eye />
          </Button>
        </span>
      ),
    },
  ];

  return (
    <DataTable
      caption="Fan mail"
      columns={columns}
      rows={rows}
      getRowId={(item) => item.id}
      getRowHref={hrefFor}
      onRowOpen={onOpen}
      selectedId={selectedId}
      empty={empty}
    />
  );
}
