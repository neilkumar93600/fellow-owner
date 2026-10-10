'use client';

import {
  type FeedbackVerdict,
  INBOX_TAB_LABELS,
  INBOX_TABS,
  type InboxItem,
  type InboxSort,
  type InboxTab,
  type PitchStatus,
} from '@fellow-owners/shared';
import { Inbox, SearchX, ShieldCheck, TriangleAlert } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import type * as React from 'react';
import { useState } from 'react';
import { TableSkeleton } from '@/components/shared/card-skeletons';
import { CopyButton } from '@/components/shared/copy-button';
import { EmptyState } from '@/components/shared/empty-state';
import { Pagination } from '@/components/shared/pagination';
import { TabBar } from '@/components/shared/tab-bar';
import { Button } from '@/components/ui/button';
import {
  useInbox,
  useInboxAction,
  useInboxFeedback,
  useInboxItem,
} from '@/hooks/queries/use-inbox';
import { useDebounce } from '@/hooks/use-debounce';
import { appUrl } from '@/lib/env';
import { routes } from '@/lib/routes';
import { toastSuccess } from '@/lib/toast';
import { CardsSkeleton, InboxCards } from './inbox-cards';
import { InboxTable } from './inbox-table';
import { InboxToolbar, type InboxViewMode, STATUS_FILTERS } from './inbox-toolbar';
import { PitchPanel } from './pitch-panel';
import { QuestionStrip } from './question-strip';

/** The first words of each tab's empty list. */
const EMPTY_NOUN: Record<Exclude<InboxTab, 'filtered'>, string> = {
  all: 'fan mail',
  collabs: 'collab messages',
  brand_deals: 'brand deal messages',
  ideas: 'idea messages',
  press: 'press messages',
  fan_notes: 'fan notes',
};

/** The list view rides in ?view=table; Cards is the default and stays out of the URL. */
const withView = (href: string, view: InboxViewMode) =>
  view === 'table' ? `${href}${href.includes('?') ? '&' : '?'}view=table` : href;

const firstName = (item: InboxItem) => item.sender.name.split(' ')[0];

export interface InboxViewProps {
  /** The active tab, which the page reads from the URL (tabs are links). */
  tab: InboxTab;
  /** The bio link's path, copied from the empty state. */
  bioLink: string;
  /** Open "What fans want" groups and how many fans asked in them (the strip above the tabs); null hides it. */
  questions: { groups: number; people: number } | null;
  /** Fans see when a message was read; the panel says so. */
  showReadReceipts: boolean;
  /** One clock for the server and client renders, so relative dates hydrate unchanged. */
  now: number;
}

/**
 * DESIGN.md Fan mail: tab bar, toolbar (search, Sort, Status, Cards or Table, "..."), the message list
 * (cards by default, the table on ?view=table) with pagination, and the side panel on ?item=. Search,
 * sort, status, view, page and item live in the URL; writes go through the
 * native History API, which Next syncs with useSearchParams, so Back still works. The list pages, sorts
 * and filters on the server (useInbox); every action goes through useInboxAction.
 */
export function InboxView({ tab, bioLink, questions, showReadReceipts, now }: InboxViewProps) {
  const params = useSearchParams();
  const q = params.get('q') ?? '';
  const sort: InboxSort = params.get('sort') === 'newest' ? 'newest' : 'fit';
  const status = STATUS_FILTERS.find((s) => s === params.get('status')) ?? null;
  const itemId = params.get('item');
  const view: InboxViewMode = params.get('view') === 'table' ? 'table' : 'cards';

  // The search box answers from local state while the URL follows; a ?q= from elsewhere (the header
  // search, Back) replaces it. The request waits for a pause in typing.
  const [search, setSearch] = useState(q);
  const [lastQ, setLastQ] = useState(q);
  if (q !== lastQ) {
    setLastQ(q);
    setSearch(q);
  }
  const needle = search.trim();
  const list = useInbox({ tab, sort, status, q: useDebounce(needle) });
  const rows = list.items;
  const detail = useInboxItem(itemId).data ?? null;
  const action = useInboxAction();
  const feedback = useInboxFeedback();

  const query = {
    tab,
    sort,
    status: status ?? undefined,
    q: needle || undefined,
    page: list.page,
    item: itemId ?? undefined,
  };
  const go = (patch: Partial<typeof query>, push = false, nextView: InboxViewMode = view) => {
    const href = withView(routes.dashboard.inbox({ ...query, ...patch }), nextView);
    window.history[push ? 'pushState' : 'replaceState'](null, '', href);
  };

  // The panel keeps showing the last pitch while it closes, so its title does not blank mid-exit. A
  // pitch off the current page (a link, Back) opens from its detail.
  const selected = itemId ? (rows.find((item) => item.id === itemId) ?? detail) : null;
  const [shown, setShown] = useState(selected);
  if (selected && selected !== shown) setShown(selected);

  const open = (item: InboxItem) => go({ item: item.id }, !itemId);

  const setStatus = (item: InboxItem, next: PitchStatus) => {
    if (next !== 'new' && next !== 'shortlisted' && next !== 'archived') return;
    action.mutate(
      { id: item.id, action: { action: 'set_status', status: next } },
      {
        onSuccess: () =>
          toastSuccess(
            next === 'shortlisted'
              ? `${firstName(item)} is on your shortlist.`
              : next === 'archived'
                ? `Archived the message from ${firstName(item)}.`
                : `The message from ${firstName(item)} is back in New.`,
          ),
      },
    );
  };
  const restore = (item: InboxItem) =>
    action.mutate(
      { id: item.id, action: { action: 'restore' } },
      {
        onSuccess: () =>
          toastSuccess(`Restored. The message from ${firstName(item)} is back in All.`),
      },
    );
  const retry = (item: InboxItem) =>
    action.mutate(
      { id: item.id, action: { action: 'rescore' } },
      { onSuccess: () => toastSuccess('Sent back to the AI for another read.') },
    );
  const vote = (item: InboxItem, verdict: FeedbackVerdict) => {
    const next = detail?.id === item.id && detail.feedback === verdict ? null : verdict;
    feedback.mutate({ id: item.id, verdict: next });
    if (next) toastSuccess('Thanks. Your matches learn from your answers.');
  };
  const sendReply = (item: InboxItem, reply: string) =>
    action.mutate(
      { id: item.id, action: { action: 'reply', reply } },
      { onSuccess: () => toastSuccess(`Reply sent to ${firstName(item)}.`) },
    );

  const clearFilters = () => {
    setSearch('');
    go({ q: undefined, status: undefined, page: 1 });
  };

  const empty =
    needle || status ? (
      <EmptyState
        icon={SearchX}
        body="No fan mail matches this search and status."
        action={
          <Button variant="secondary" onClick={clearFilters}>
            Clear search and status
          </Button>
        }
        className="min-h-96"
      />
    ) : tab === 'filtered' ? (
      <EmptyState
        icon={ShieldCheck}
        tint="aqua"
        body="Nothing kept out. Messages the AI flags as spam land here, each with its reason."
        className="min-h-96"
      />
    ) : (
      <EmptyState
        icon={Inbox}
        body={`No ${EMPTY_NOUN[tab]} yet. Your bio link has a Send an idea button.`}
        action={
          <CopyButton
            variant="secondary"
            label="Copy bio link"
            message="Bio link copied"
            value={appUrl(bioLink)}
          />
        }
        className="min-h-96"
      />
    );

  return (
    <div className="flex flex-col gap-4">
      <h1 className="sr-only">Fan mail</h1>
      {questions ? <QuestionStrip groups={questions.groups} people={questions.people} /> : null}
      <TabBar
        label="Fan mail views"
        tabs={INBOX_TABS.map((value) => ({
          href: withView(
            routes.dashboard.inbox({ tab: value, sort, status: query.status, q: query.q }),
            view,
          ),
          label: INBOX_TAB_LABELS[value],
          active: value === tab,
        }))}
      />
      <InboxToolbar
        count={list.counts?.[tab] ?? 0}
        search={search}
        onSearch={(value) => {
          setSearch(value);
          go({ q: value.trim() || undefined, page: 1 });
        }}
        sort={sort}
        onSort={(next) => go({ sort: next, page: 1 })}
        status={status}
        onStatus={(next) => go({ status: next ?? undefined, page: 1 })}
        view={view}
        onView={(next) => go({}, false, next)}
      />
      {list.isLoading ? (
        <div aria-busy="true">
          <span className="sr-only" role="status">
            Loading
          </span>
          {view === 'table' ? <TableSkeleton rows={10} columns={6} /> : <CardsSkeleton />}
        </div>
      ) : list.isError ? (
        <section aria-label="Fan mail" role="alert" className="glass-strong rounded-panel">
          <EmptyState
            icon={TriangleAlert}
            tint="peach"
            body="We could not load your fan mail."
            action={
              <Button variant="secondary" onClick={list.refetch}>
                Try again
              </Button>
            }
            className="min-h-96"
          />
        </section>
      ) : (
        <ListView
          view={view}
          rows={rows}
          selectedId={selected?.id ?? null}
          hrefFor={(item) => withView(routes.dashboard.inbox({ ...query, item: item.id }), view)}
          onOpen={open}
          onRetry={retry}
          onRestore={restore}
          now={now}
          empty={empty}
        />
      )}
      <Pagination
        page={list.page}
        pageCount={list.pageCount}
        onPageChange={list.goTo}
        label="Fan mail pages"
      />
      {shown ? (
        <PitchPanel
          item={shown}
          open={selected !== null}
          detail={detail?.id === shown.id ? detail : null}
          vote={detail?.id === shown.id ? detail.feedback : null}
          showReadReceipts={showReadReceipts}
          now={now}
          onOpenChange={(next) => {
            if (!next) go({ item: undefined });
          }}
          finalFocus={() => {
            // Back to the row's sender link (the table or the stacked list, whichever is showing).
            const links = document.querySelectorAll<HTMLElement>(
              `#main a[href*="item=${shown.id}"]`,
            );
            return Array.from(links).find((link) => link.offsetParent !== null) ?? true;
          }}
          onStatus={setStatus}
          onRestore={restore}
          onRetry={retry}
          onVote={vote}
          onReply={sendReply}
        />
      ) : null}
    </div>
  );
}

/** Cards by default, the table on ?view=table. */
function ListView({
  view,
  ...props
}: { view: InboxViewMode } & React.ComponentProps<typeof InboxTable>) {
  return view === 'table' ? <InboxTable {...props} /> : <InboxCards {...props} />;
}
