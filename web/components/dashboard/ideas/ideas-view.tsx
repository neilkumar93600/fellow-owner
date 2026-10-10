'use client';

import type { IdeaItem, IdeasView as IdeasViewMode, PostType } from '@fellow-owners/shared';
import { Lightbulb, TriangleAlert } from 'lucide-react';
import { usePathname, useSearchParams } from 'next/navigation';
import type * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { ExportCsvMenu } from '@/components/dashboard/export-csv-link';
import { Banner } from '@/components/shared/banner';
import { IdeaCardSkeleton } from '@/components/shared/card-skeletons';
import { CountChips } from '@/components/shared/count-chips';
import { EmptyState } from '@/components/shared/empty-state';
import { Pagination } from '@/components/shared/pagination';
import { SegmentedPill } from '@/components/shared/segmented-pill';
import { SearchSquare } from '@/components/shared/toolbar';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { useIdeas, useStudioPost } from '@/hooks/queries/use-ideas';
import { IdeasBoard } from './ideas-board';
import { IdeasGrid } from './ideas-grid';
import { PostPanel } from './post-panel';

const VIEW_OPTIONS = [
  { value: 'ranked', label: 'Ranked' },
  { value: 'board', label: 'Board' },
] as const satisfies readonly { value: IdeasViewMode; label: string }[];

type TypeFilter = 'all' | PostType;
const TYPE_OPTIONS: readonly { value: TypeFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'idea', label: 'Ideas' },
  { value: 'project', label: 'Collabs' },
  { value: 'discussion', label: 'Discussions' },
];

/**
 * /dashboard/ideas: the community count chips, the Ranked or Board pill with search and type, then the
 * idea cards (cover tint, Loved badge, signals, status; the fit as words) or the status board, and the post side panel on ?item=. Every filter lives in the URL,
 * written with the history API; the API filters and pages them (the search after a short pause).
 */
export function IdeasView() {
  const params = useSearchParams();
  const pathname = usePathname();
  const community = params.get('community') ?? '';
  const view: IdeasViewMode = params.get('view') === 'board' ? 'board' : 'ranked';
  const type = TYPE_OPTIONS.find((option) => option.value === params.get('type'))?.value ?? 'all';
  const itemId = params.get('item');

  // The search box reads local state: a URL update lands in a transition, too late for a typed key.
  const [search, setSearch] = useState(() => params.get('q') ?? '');
  // The URL the panel was pushed from, and the card link that opened it (focus returns there).
  const beforePanel = useRef<string | null>(null);
  const opener = useRef<HTMLElement | null>(null);

  /** Query values in, null or '' drops a key. */
  function urlWith(patch: Record<string, string | null>): string {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    const query = next.toString();
    return query ? `${pathname}?${query}` : pathname;
  }

  function setQuery(patch: Record<string, string | null>, push = false) {
    const url = urlWith(patch);
    if (push) window.history.pushState(null, '', url);
    else window.history.replaceState(null, '', url);
  }

  // Typing updates the box at once; the list asks the API after a short pause.
  const [q, setQ] = useState(search.trim());
  useEffect(() => {
    const timer = window.setTimeout(() => setQ(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const list = useIdeas({ community, type: type === 'all' ? null : type, q });
  const { items, counts } = list;
  const detail = useStudioPost(itemId);
  const needle = search.trim();

  // Keep the last post while the panel animates out, so its title never blanks.
  // The full record once it loads (it carries the hidden flag the actions change), else the list item.
  const openPost: IdeaItem | null = itemId
    ? detail.data?.id === itemId
      ? detail.data
      : (items.find((post) => post.id === itemId) ?? null)
    : null;
  const [shownPost, setShownPost] = useState<IdeaItem | null>(openPost);
  if (openPost && openPost !== shownPost) setShownPost(openPost);
  const panelPost = openPost ?? shownPost;

  function open(id: string) {
    // Opening pushes, so Back closes the panel; another card while it is open swaps in place.
    if (!itemId) beforePanel.current = urlWith({ item: null });
    setQuery({ item: id }, !itemId);
  }

  function close() {
    // Step back to the pushed-from entry when nothing else changed meanwhile; else drop ?item= in place.
    const before = beforePanel.current;
    beforePanel.current = null;
    if (before && before === urlWith({ item: null })) window.history.back();
    else setQuery({ item: null });
  }

  // ponytail: IdeaCard's Open and title are plain links; this catches their ?item= clicks to open the
  // panel in place (no server round trip, no scroll jump). An onOpen prop on IdeaCard would replace it.
  function openFromLink(event: React.MouseEvent<HTMLElement>) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
      return;
    const link = (event.target as Element).closest('a');
    const href = link?.getAttribute('href') ?? '';
    if (!link || !href.startsWith(`${pathname}?`)) return;
    const id = new URLSearchParams(href.slice(pathname.length + 1)).get('item');
    if (!id) return;
    event.preventDefault();
    opener.current = link;
    open(id);
  }

  const hrefFor = (id: string) => urlWith({ item: id });
  const filtersOn = Boolean(community || needle || type !== 'all');
  const loaded = list.data !== undefined;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="sr-only">Ideas</h1>

      {list.isError && !loaded ? null : (
        <CountChips
          label="Filter ideas by community"
          chips={[
            {
              key: 'all',
              label: 'All',
              // The counts follow type and search, not the community filter, so they add up to All.
              count: counts.reduce((sum, count) => sum + count.count, 0),
              active: !community,
              onSelect: () => setQuery({ community: null, page: null }),
            },
            ...counts.map((count) => ({
              key: count.slug,
              label: count.name,
              count: count.count,
              active: community === count.slug,
              onSelect: () => setQuery({ community: count.slug, page: null }),
            })),
          ]}
        />
      )}

      {itemId && detail.isError && !openPost ? (
        <Banner icon={TriangleAlert}>
          <p role="alert">
            That post could not be opened.{' '}
            <button
              type="button"
              onClick={() => detail.refetch()}
              className="underline underline-offset-4"
            >
              Try again
            </button>
          </p>
        </Banner>
      ) : null}

      {/* Two glass pieces side by side on the shell, never one inside the other. */}
      <div className="flex flex-wrap items-center gap-3">
        <SegmentedPill
          label="Ideas view"
          options={VIEW_OPTIONS}
          value={view}
          onChange={(next) => setQuery({ view: next === 'ranked' ? null : next, page: null })}
        />
        <div className="ml-auto flex min-w-0 flex-auto items-center justify-end gap-3">
          <SearchSquare
            label="Search ideas"
            placeholder="Title or topic"
            value={search}
            onChange={(next) => {
              setSearch(next);
              setQuery({ q: next.trim() ? next : null, page: null });
            }}
          />
          <Select
            label="Type"
            showLabel
            options={TYPE_OPTIONS}
            value={type}
            onValueChange={(next) => setQuery({ type: next === 'all' ? null : next, page: null })}
          />
          <ExportCsvMenu kind="ideas" />
        </div>
      </div>

      {!loaded && list.isError ? (
        <EmptyState
          icon={TriangleAlert}
          body="Ideas could not load. Check your connection and try again."
          action={
            <Button variant="secondary" surface="glass" onClick={list.refetch}>
              Try again
            </Button>
          }
          className="min-h-[360px]"
        />
      ) : !loaded ? (
        <div aria-busy="true">
          <span className="sr-only" role="status">
            Loading ideas
          </span>
          <ul className="grid grid-cols-1 gap-5 @lg:grid-cols-2 @4xl:grid-cols-3">
            {Array.from({ length: 6 }, (_, index) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
              <li key={index} className="flex min-w-0">
                <IdeaCardSkeleton className="flex-1" />
              </li>
            ))}
          </ul>
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Lightbulb}
          body={
            filtersOn
              ? 'No ideas match these filters. Try another community or type.'
              : 'No ideas yet. They arrive as fans post in your communities.'
          }
          action={
            filtersOn ? (
              <Button
                variant="secondary"
                surface="glass"
                onClick={() => {
                  setSearch('');
                  setQuery({ community: null, type: null, q: null, page: null });
                }}
              >
                Clear filters
              </Button>
            ) : null
          }
          className="min-h-[360px]"
        />
      ) : (
        <div onClickCapture={openFromLink} className="min-w-0">
          {view === 'ranked' ? (
            <>
              <h2 className="sr-only">Ideas ranked by fit, signals and recency</h2>
              <IdeasGrid posts={items} hrefFor={hrefFor} />
            </>
          ) : (
            <IdeasBoard posts={items} hrefFor={hrefFor} />
          )}
        </div>
      )}

      {loaded && list.isError ? (
        <Banner icon={TriangleAlert}>
          <p role="alert">
            This page could not refresh.{' '}
            <button type="button" onClick={list.refetch} className="underline underline-offset-4">
              Try again
            </button>
          </p>
        </Banner>
      ) : null}

      <Pagination
        label="Idea pages"
        page={list.page}
        pageCount={list.pageCount}
        onPageChange={list.goTo}
        className="self-center"
      />

      <PostPanel
        post={panelPost}
        detail={detail.data ?? null}
        open={Boolean(openPost)}
        onOpenChange={(next) => {
          if (!next) close();
        }}
        finalFocus={opener}
      />
    </div>
  );
}
