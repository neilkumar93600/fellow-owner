'use client';

import { REPORT_REASON_LABELS, type ReportItem, type ReportStatus } from '@fellow-owners/shared';
import { Flag } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { EmptyState } from '@/components/shared/empty-state';
import { SegmentedPill } from '@/components/shared/segmented-pill';
import { Toolbar } from '@/components/shared/toolbar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useActOnReport, useReports } from '@/hooks/queries/use-reports';
import { formatRelative } from '@/lib/format';
import { QueryError } from './query-error';

const TABS: { value: ReportStatus; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'dismissed', label: 'Dismissed' },
];

/** /dashboard/communities/reports: what members flagged, with Hide, Resolve and Dismiss. */
export function ReportsView() {
  const [status, setStatus] = useState<ReportStatus>('open');
  const { data, isPending, isError, error, refetch } = useReports(status);
  const act = useActOnReport();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="sr-only">Reports</h1>
      <Toolbar
        title="Reports"
        end={
          <SegmentedPill label="Report status" value={status} onChange={setStatus} options={TABS} />
        }
      />
      {isPending ? (
        <div aria-busy="true" className="flex flex-col gap-3">
          <span className="sr-only" role="status">
            Loading reports
          </span>
          <Skeleton className="h-28 rounded-panel" />
          <Skeleton className="h-28 rounded-panel" />
        </div>
      ) : isError ? (
        <QueryError error={error} onRetry={() => void refetch()} />
      ) : data.items.length === 0 ? (
        <EmptyState
          icon={Flag}
          body={
            status === 'open'
              ? 'No open reports. When a member flags a post or comment, it shows up here.'
              : 'Nothing here yet.'
          }
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {data.items.map((item) => (
            <ReportRow
              key={item.id}
              item={item}
              busy={act.isPending && act.variables?.id === item.id}
              onAct={(action) => act.mutate({ id: item.id, action })}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function ReportRow({
  item,
  busy,
  onAct,
}: {
  item: ReportItem;
  busy: boolean;
  onAct: (action: 'resolve' | 'dismiss' | 'hide_target') => void;
}) {
  const { target } = item;
  return (
    <li className="glass-strong min-w-0 p-5 sm:p-6">
      <p className="text-small text-ink-soft">
        {REPORT_REASON_LABELS[item.reason]} · {target.type === 'post' ? 'Post' : 'Comment'} ·{' '}
        {item.reporterName ? `reported by ${item.reporterName}` : 'reporter left'} ·{' '}
        <time dateTime={item.createdAt} suppressHydrationWarning>
          {formatRelative(item.createdAt)}
        </time>
      </p>
      <p className="mt-2 break-words text-body text-ink">
        <Link href={target.href} className="underline underline-offset-2">
          {target.excerpt}
        </Link>
        {target.authorName ? <span className="text-ink-soft"> by {target.authorName}</span> : null}
      </p>
      {item.note ? (
        <p className="mt-2 break-words text-small text-ink-soft">"{item.note}"</p>
      ) : null}
      {item.status === 'open' ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {target.hidden ? null : (
            <Button
              variant="secondary"
              size="md"
              loading={busy}
              onClick={() => onAct('hide_target')}
            >
              Hide {target.type}
            </Button>
          )}
          <Button variant="secondary" size="md" disabled={busy} onClick={() => onAct('resolve')}>
            Resolve
          </Button>
          <Button variant="ghost" size="md" disabled={busy} onClick={() => onAct('dismiss')}>
            Dismiss
          </Button>
        </div>
      ) : (
        <p className="mt-3 text-small text-ink-soft">
          {item.status === 'resolved' ? 'Resolved' : 'Dismissed'}
          {target.hidden ? ' · hidden from members' : ''}
        </p>
      )}
    </li>
  );
}
