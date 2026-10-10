'use client';

import {
  hashKey,
  keepPreviousData,
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useUrlState } from '@/hooks/use-url-state';
import { shouldRetry } from '@/lib/query-client';

// Lists on the API's opaque cursors ({ items, nextCursor }): numbered pages for tables and grids,
// "load more" for feeds.

export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
}

type FetchPage<P> = (cursor: string | null, signal?: AbortSignal) => Promise<P>;

/** A ?page= past the end of the list. Never retried: the hook clamps to the last page instead. */
class PastEndError extends Error {}

function retryPage(failureCount: number, error: unknown): boolean {
  return !(error instanceof PastEndError) && shouldRetry(failureCount, error);
}

const NO_PAGES: never[] = [];

function toPage(raw: string | null): number {
  const n = Number(raw);
  return Number.isInteger(n) && n > 1 ? n : 1;
}

/**
 * Numbered pages over cursors. Page n's cursor is page n-1's nextCursor, so a jump walks the chain once
 * and reuses every page already cached; each page is its own query, [...queryKey, 'page', index].
 * The page lives in ?page= (or local state when `urlParam` is null), resets to 1 when `queryKey`
 * changes under it, and is clamped to the list. `total` (a number, or read from a page: `(p) => p.total`)
 * gives the page count; without it the count is the pages seen plus one while a nextCursor exists.
 */
export function useCursorPages<P extends CursorPage<unknown>>({
  queryKey,
  fetchPage,
  pageSize,
  total,
  urlParam = 'page',
  enabled = true,
}: {
  queryKey: readonly unknown[];
  fetchPage: FetchPage<P>;
  pageSize: number;
  total?: number | ((page: P) => number | undefined);
  urlParam?: string | null;
  enabled?: boolean;
}): {
  page: number;
  pageCount: number;
  data: P | undefined;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => void;
  goTo: (n: number) => void;
  hasNext: boolean;
  hasPrev: boolean;
} {
  const queryClient = useQueryClient();
  const { get, set } = useUrlState();
  const [localPage, setLocalPage] = useState(1);
  const keyHash = hashKey(queryKey);
  const raw = urlParam ? get(urlParam) : null;
  const requested = urlParam ? toPage(raw) : localPage;

  // A new filter, sort or tab under an unchanged page number: that page belonged to the old list, so
  // show page 1. When the page moved too (Back, a link), the URL is trusted.
  const [seen, setSeen] = useState({ keyHash, requested, enabled, stale: false });
  if (seen.keyHash !== keyHash || seen.requested !== requested || seen.enabled !== enabled) {
    setSeen({
      keyHash,
      requested,
      enabled,
      stale:
        seen.keyHash !== keyHash
          ? seen.enabled && seen.requested === requested && requested > 1
          : seen.stale && seen.requested === requested,
    });
  }

  const pageKey = (index: number) => [...queryKey, 'page', index];
  const cachedAt = (index: number) => queryClient.getQueryData<P>(pageKey(index));

  const fetchAt = async (index: number, signal?: AbortSignal): Promise<P> => {
    if (index === 0) return fetchPage(null, signal);
    const previous = await queryClient.query({
      queryKey: pageKey(index - 1),
      queryFn: (context) => fetchAt(index - 1, context.signal),
      staleTime: 'static',
      retry: retryPage,
    });
    if (!previous.nextCursor) throw new PastEndError();
    return fetchPage(previous.nextCursor, signal);
  };

  // The run of cached pages from page 1: how far the list is known, and whether its end was seen.
  let known = 0;
  let ended = false;
  let last: P | undefined;
  for (let data = cachedAt(0); data; data = cachedAt(known)) {
    last = data;
    known += 1;
    if (!data.nextCursor) {
      ended = true;
      break;
    }
  }

  const sample = cachedAt(requested - 1) ?? last;
  const count = typeof total === 'function' ? (sample ? total(sample) : undefined) : total;
  const totalPages = count === undefined ? undefined : Math.max(1, Math.ceil(count / pageSize));

  // The furthest page that can exist; unbounded until the total or the list's end is known.
  const lastPage = Math.min(
    totalPages ?? Number.POSITIVE_INFINITY,
    ended ? known : Number.POSITIVE_INFINITY,
  );
  const page = Math.min(seen.stale ? 1 : requested, lastPage);
  const here = cachedAt(page - 1);
  const pageCount =
    totalPages ?? (ended ? known : Math.max(known + 1, here?.nextCursor ? page + 1 : page));

  const query = useQuery({
    queryKey: pageKey(page - 1),
    queryFn: ({ signal }) => fetchAt(page - 1, signal),
    placeholderData: keepPreviousData,
    enabled,
    retry: retryPage,
  });

  // Keep the URL (or local state) on the page actually shown: page 1 after a reset, the last page after
  // a clamp, and no ?page= at all for page 1.
  useEffect(() => {
    if (!urlParam) {
      if (localPage !== page) setLocalPage(page);
      return;
    }
    const canonical = page > 1 ? String(page) : null;
    if (raw !== canonical) set({ [urlParam]: canonical });
  }, [urlParam, raw, page, localPage, set]);

  function goTo(n: number) {
    const next = Math.max(1, Math.min(Math.trunc(n) || 1, lastPage));
    setSeen((current) => ({ ...current, stale: false }));
    if (urlParam) set({ [urlParam]: next > 1 ? next : null });
    else setLocalPage(next);
  }

  return {
    page,
    pageCount,
    data: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: () => void query.refetch(),
    goTo,
    hasNext: page < pageCount,
    hasPrev: page > 1,
  };
}

/** "Load more" over cursors, for feeds: all loaded pages and their items in order. */
export function useInfiniteCursor<P extends CursorPage<unknown>>({
  queryKey,
  fetchPage,
  enabled = true,
}: {
  queryKey: readonly unknown[];
  fetchPage: FetchPage<P>;
  enabled?: boolean;
}): {
  pages: P[];
  items: P['items'];
  fetchNextPage: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => void;
} {
  const query = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam, signal }) => fetchPage(pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage: P) => lastPage.nextCursor,
    enabled,
  });
  const pages = query.data?.pages ?? NO_PAGES;
  const items = useMemo(() => pages.flatMap((p) => p.items) as P['items'], [pages]);

  return {
    pages,
    items,
    // cancelRefetch false: an intersection observer firing twice joins the fetch in flight.
    fetchNextPage: () => {
      if (query.hasNextPage) void query.fetchNextPage({ cancelRefetch: false });
    },
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: () => void query.refetch(),
  };
}
