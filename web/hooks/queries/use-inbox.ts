import {
  type FeedbackVerdict,
  INBOX_TAB_PITCH_TYPE,
  type InboxDetail,
  type InboxItem,
  type InboxPage,
  type InboxSort,
  type InboxTab,
  type PitchStatus,
  type StudioPitchAction,
} from '@fellow-owners/shared';
import {
  type QueryKey,
  skipToken,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useCursorPages } from '@/hooks/use-cursor-list';
import { actOnInboxItem, getInbox, getInboxItem, sendFeedback } from '@/lib/api/studio';
import { shouldRetry } from '@/lib/query-client';
import { toastError } from '@/lib/toast';
import { overviewKeys } from './use-overview';

export const INBOX_PAGE_SIZE = 20;

export interface InboxFilters {
  /** Default 'all'. */
  tab?: InboxTab;
  /** Default 'fit'. */
  sort?: InboxSort;
  status?: PitchStatus | null;
  q?: string | null;
  /** Today: leave out pitches snoozed with Later. */
  hideSnoozed?: boolean;
}

/** Filters as they sit in query keys and requests: defaults filled in, blanks left out. */
interface InboxListFilters {
  tab: InboxTab;
  sort: InboxSort;
  status?: PitchStatus;
  q?: string;
  hideSnoozed?: true;
}

function listFilters({ tab, sort, status, q, hideSnoozed }: InboxFilters): InboxListFilters {
  return {
    tab: tab ?? 'all',
    sort: sort ?? 'fit',
    status: status ?? undefined,
    q: q?.trim() || undefined,
    ...(hideSnoozed ? { hideSnoozed: true as const } : {}),
  };
}

export const inboxKeys = {
  all: ['studio', 'inbox'] as const,
  lists: ['studio', 'inbox', 'list'] as const,
  list: (filters: InboxFilters) => ['studio', 'inbox', 'list', listFilters(filters)] as const,
  detail: (id: string) => ['studio', 'inbox', 'detail', id] as const,
};

const actionKey = ['studio', 'inbox', 'action'] as const;

/**
 * One inbox tab, 20 a page with numbered pages (?page=). `counts` holds every tab's count under
 * the current status and q filters (the API applies them to counts too), so it feeds the tab
 * chips and the page total. The last page stays shown while the next one loads.
 */
export function useInbox(filters: InboxFilters = {}) {
  const queryKey = inboxKeys.list(filters);
  const params = queryKey[3];
  const list = useCursorPages<InboxPage>({
    queryKey,
    fetchPage: (cursor, signal) => getInbox({ ...params, cursor, limit: INBOX_PAGE_SIZE }, signal),
    pageSize: INBOX_PAGE_SIZE,
    total: (page) => page.counts[params.tab],
  });
  return { ...list, items: list.data?.items ?? [], counts: list.data?.counts };
}

/** The side panel's pitch (?item=). While the AI reviews it again (Rescore), it checks back. */
export function useInboxItem(id: string | null | undefined) {
  return useQuery({
    queryKey: inboxKeys.detail(id ?? ''),
    queryFn: id ? ({ signal }) => getInboxItem(id, signal) : skipToken,
    refetchInterval: (query) => (query.state.data?.ai.status === 'pending' ? 5000 : false),
  });
}

export interface InboxActionVars {
  id: string;
  /** Shortlist, archive or move back to new (set_status), restore, reply, rescore. */
  action: StudioPitchAction;
}

/**
 * Acts on a pitch, optimistically: the row changes its status badge, or leaves the list when
 * it no longer fits the tab or status filter, and the tab counts move with it. A failure
 * reverts and toasts with Retry. Actions run one at a time, in click order.
 */
export function useInboxAction() {
  const queryClient = useQueryClient();
  // The last action of a quick run settles the lists, so earlier refetches never undo later ones.
  const isLast = () => queryClient.isMutating({ mutationKey: actionKey }) === 1;

  const mutation = useMutation({
    mutationKey: actionKey,
    scope: { id: 'inbox-action' },
    mutationFn: ({ id, action }: InboxActionVars) => actOnInboxItem(id, action),
    onMutate: async ({ id, action }) => {
      const lists = { queryKey: inboxKeys.lists };
      const detail = { queryKey: inboxKeys.detail(id) };
      await Promise.all([queryClient.cancelQueries(lists), queryClient.cancelQueries(detail)]);
      const snapshot = [
        ...queryClient.getQueriesData(lists),
        ...queryClient.getQueriesData(detail),
      ];
      // Every cached page of every list (useCursorPages keeps each page at [...key, 'page', i]).
      for (const [key, page] of queryClient.getQueriesData<InboxPage>(lists)) {
        const filters = filtersOf(key);
        if (page && filters) queryClient.setQueryData(key, movePitch(page, filters, id, action));
      }
      queryClient.setQueryData<InboxDetail>(
        detail.queryKey,
        (current) => current && applyAction(current, action),
      );
      return { snapshot };
    },
    onSuccess: (detail) => {
      if (isLast()) queryClient.setQueryData(inboxKeys.detail(detail.id), detail);
    },
    onError: (error, vars, context) => {
      for (const [key, data] of context?.snapshot ?? []) queryClient.setQueryData(key, data);
      // A panel whose first load was cancelled above would otherwise wait forever.
      queryClient.invalidateQueries({ queryKey: inboxKeys.detail(vars.id) });
      toastError(error, {
        retry: shouldRetry(0, error)
          ? () => {
              mutation.mutate(vars);
            }
          : undefined,
      });
    },
    onSettled: () => {
      if (!isLast()) return;
      queryClient.invalidateQueries({ queryKey: inboxKeys.lists });
      // Opportunities waiting and the inbox mix follow status and restore.
      queryClient.invalidateQueries({ queryKey: overviewKeys.all });
    },
  });
  return mutation;
}

export interface InboxFeedbackVars {
  id: string;
  verdict: FeedbackVerdict | null;
}

/** Thumbs on the AI's read of a pitch (null clears the vote), shown at once; a failure reverts and toasts. */
export function useInboxFeedback() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: ({ id, verdict }: InboxFeedbackVars) =>
      sendFeedback({ refType: 'inbound', refId: id, verdict }),
    onMutate: async ({ id, verdict }) => {
      const key = inboxKeys.detail(id);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<InboxDetail>(key);
      queryClient.setQueryData<InboxDetail>(
        key,
        (current) => current && { ...current, feedback: verdict },
      );
      return { previous };
    },
    onError: (error, vars, context) => {
      if (context?.previous) queryClient.setQueryData(inboxKeys.detail(vars.id), context.previous);
      toastError(error, {
        retry: shouldRetry(0, error)
          ? () => {
              mutation.mutate(vars);
            }
          : undefined,
      });
    },
  });
  return mutation;
}

// ---------------------------------------------------------------- optimistic moves

/** Pitch type -> its type tab. 'other' has none: it only shows under All. */
const TYPE_TAB: Partial<Record<string, InboxTab>> = Object.fromEntries(
  Object.entries(INBOX_TAB_PITCH_TYPE).map(([tab, type]) => [type, tab as InboxTab]),
);

/** The tabs a pitch counts under, filed as the API files it (the AI category once analyzed). */
function tabsOf(item: InboxItem): InboxTab[] {
  if (item.isFiltered) return ['filtered'];
  if (item.status === 'withdrawn') return [];
  const type = item.ai.status === 'done' && item.ai.category ? item.ai.category : item.type;
  const tab = TYPE_TAB[type];
  return tab ? ['all', tab] : ['all'];
}

/** The pitch as the server will hold it once the action lands. */
function applyAction<T extends InboxItem>(item: T, action: StudioPitchAction): T {
  switch (action.action) {
    case 'set_status':
      return { ...item, status: action.status };
    case 'reply':
      return { ...item, status: 'replied' };
    case 'restore':
      return { ...item, isFiltered: false };
    case 'rescore':
      return { ...item, ai: { ...item.ai, status: 'pending' } };
  }
}

/**
 * One cached page after the action. Only pages showing the pitch change now; the refetch when
 * the action settles brings every other page and count up to date.
 */
function movePitch(
  page: InboxPage,
  filters: InboxListFilters,
  id: string,
  action: StudioPitchAction,
): InboxPage {
  const row = page.items.find((item) => item.id === id);
  if (!row) return page;
  const next = applyAction(row, action);
  const fits = !filters.status || next.status === filters.status;
  const counts = { ...page.counts };
  for (const tab of tabsOf(row)) counts[tab] -= 1;
  if (fits) for (const tab of tabsOf(next)) counts[tab] += 1;
  const items =
    fits && tabsOf(next).includes(filters.tab)
      ? page.items.map((item) => (item === row ? next : item))
      : page.items.filter((item) => item !== row);
  return { ...page, items, counts };
}

/** The filters in a list key: ['studio', 'inbox', 'list', filters, 'page', i]. */
function filtersOf(key: QueryKey): InboxListFilters | undefined {
  const filters = key[3];
  return filters && typeof filters === 'object' && 'tab' in filters
    ? (filters as InboxListFilters)
    : undefined;
}
