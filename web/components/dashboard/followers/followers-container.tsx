'use client';

import type { Follower, StudioCommunity } from '@fellow-owners/shared';
import { CirclePause, Minus, Plus, Sparkles, Upload, UserPlus, Users, X } from 'lucide-react';
import { Fragment, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { QueryError } from '@/components/dashboard/communities/query-error';
import { ExportCsvMenu } from '@/components/dashboard/export-csv-link';
import { PeopleTabs } from '@/components/dashboard/people/people-tabs';
import { Banner } from '@/components/shared/banner';
import { TableSkeleton } from '@/components/shared/card-skeletons';
import { CountChips } from '@/components/shared/count-chips';
import { EmptyState } from '@/components/shared/empty-state';
import { Pagination } from '@/components/shared/pagination';
import { SearchSquare, Toolbar } from '@/components/shared/toolbar';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useStudioCommunities } from '@/hooks/queries/use-communities';
import {
  useAutoTagFollowers,
  useCreateFollower,
  useDeleteFollower,
  useFollowers,
  useTagFollowers,
  useUpdateFollower,
} from '@/hooks/queries/use-followers';
import { useUrlState } from '@/hooks/use-url-state';
import { formatNumber, pluralize } from '@/lib/format';
import { routes } from '@/lib/routes';
import { toastSuccess } from '@/lib/toast';
import { FollowerPanel, type FollowerSave } from './follower-panel';
import { FollowersTable } from './followers-table';
import { ImportPanel } from './import-panel';

const ALL = 'all';
const UNTAGGED = 'untagged';
type Joined = 'all' | 'yes' | 'no';

const JOINED_OPTIONS = [
  { value: 'all', label: 'Everyone' },
  { value: 'yes', label: 'Joined' },
  { value: 'no', label: 'Not joined' },
] as const;

/** The Followers screen while its queries load. */
export function FollowersSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-4">
      <span className="sr-only" role="status">
        Loading followers
      </span>
      <Skeleton className="h-12 w-64 rounded-full" />
      <Skeleton className="h-18 rounded-full" />
      <TableSkeleton rows={8} columns={5} />
    </div>
  );
}

/**
 * /dashboard/people/followers (F23): the creator's roster of followers, imported or added by hand,
 * tagged into communities by the creator or, on the creator's click, by the AI. State lives in the URL:
 * ?q=, ?community= (a slug or `untagged`), ?joined=, ?page=, ?item= (the open follower), ?import=1.
 */
export function FollowersContainer({ now }: { now: number }) {
  const { get, set } = useUrlState();
  const urlQ = get('q') ?? '';
  const communities = useStudioCommunities();

  // Typing updates the box at once; the URL and the query follow after a pause.
  const [q, setQ] = useState(urlQ);
  useEffect(() => {
    if (q.trim() === urlQ.trim()) return;
    const timer = setTimeout(() => set({ q: q.trim() || null, page: null }), 300);
    return () => clearTimeout(timer);
  }, [q, urlQ, set]);
  useEffect(() => setQ(urlQ), [urlQ]);

  const slug = get('community') ?? '';
  const community =
    slug === UNTAGGED || communities.data?.some((c) => c.slug === slug) ? slug : ALL;
  const rawJoined = get('joined');
  const joined: Joined = rawJoined === 'yes' || rawJoined === 'no' ? rawJoined : ALL;
  const followers = useFollowers({
    q: urlQ,
    community: community === ALL ? null : community,
    joined: joined === ALL ? null : joined,
  });

  const create = useCreateFollower();
  const update = useUpdateFollower();
  const remove = useDeleteFollower();
  const tag = useTagFollowers();
  const autoTag = useAutoTagFollowers();
  const [aiPaused, setAiPaused] = useState(false);
  const [adding, setAdding] = useState(false);
  const [shown, setShown] = useState<Follower | null>(null);

  // Ticks belong to one filtered list: a new search or filter starts over.
  const filterKey = `${urlQ.trim()}|${community}|${joined}`;
  const [selection, setSelection] = useState({ key: filterKey, ids: [] as string[] });
  const picked = selection.key === filterKey ? selection.ids : [];
  const pick = (ids: string[], on: boolean) =>
    setSelection({
      key: filterKey,
      ids: on ? [...new Set([...picked, ...ids])] : picked.filter((id) => !ids.includes(id)),
    });

  const importOpen = get('import') === '1';
  const openId = get('item');
  const open = (openId && followers.items.find((f) => f.id === openId)) || null;
  // Keep the last follower while the panel animates out, so its title does not blank.
  if (open && open !== shown) setShown(open);

  if (followers.isError || communities.isError) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="sr-only">Followers</h1>
        <PeopleTabs />
        <QueryError
          error={followers.error ?? communities.error}
          onRetry={() => {
            if (followers.isError) followers.refetch();
            if (communities.isError) void communities.refetch();
          }}
        />
      </div>
    );
  }
  if (followers.isLoading || !followers.data || !communities.data) return <FollowersSkeleton />;

  const counts = followers.counts ?? { all: 0, untagged: 0, joined: 0 };
  const total = followers.total ?? 0;
  const active = communities.data.filter((c) => !c.archivedAt);

  function runAutoTag() {
    autoTag.mutate(
      {},
      {
        onSuccess: (result) => {
          setAiPaused(result.aiPaused);
          if (result.aiPaused) {
            // The banner sits behind the import sheet on small screens, so say it here too.
            toast.info('AI paused until tomorrow, so nothing was tagged.');
            return;
          }
          const n = result.tagged;
          toastSuccess(
            `Tagged ${formatNumber(n)} ${pluralize(n, 'follower')}.${
              result.skipped
                ? ` ${formatNumber(result.skipped)} without a note or a match were left as they are.`
                : ''
            }`,
          );
        },
      },
    );
  }

  async function save(change: FollowerSave) {
    if (change.kind === 'create') {
      const added = await create.mutateAsync(change.input);
      toastSuccess(`${added.name} is on your follower list.`);
    } else {
      const saved = await update.mutateAsync({ id: change.id, patch: change.patch });
      toastSuccess(`${saved.name} is saved.`);
    }
  }

  async function deleteShown() {
    if (!shown) return;
    try {
      await remove.mutateAsync(shown.id);
    } catch {
      return; // the hook toasted the error with a retry; keep the panel open
    }
    pick([shown.id], false);
    set({ item: null });
    toastSuccess(`${shown.name} is off your follower list.`);
  }

  const setImport = (next: boolean) => set({ import: next ? '1' : null });
  const importButton = (
    <Button size="md" icon={<Upload />} onClick={() => setImport(true)}>
      Import
    </Button>
  );

  // Keyed so the panels keep their state when the screen swaps from the empty state to the roster
  // (the first import lands, and its summary must stay on screen).
  const panels = (
    <Fragment key="panels">
      <ImportPanel
        open={importOpen}
        onOpenChange={setImport}
        communities={communities.data}
        onAutoTag={runAutoTag}
        autoTagging={autoTag.isPending}
      />
      <FollowerPanel
        open={adding || open !== null}
        onOpenChange={(next) => {
          if (next) return;
          setAdding(false);
          if (openId) set({ item: null });
        }}
        follower={adding ? null : shown}
        communities={communities.data}
        saving={create.isPending || update.isPending}
        onSave={save}
        onDelete={() => void deleteShown()}
      />
    </Fragment>
  );

  const pausedBanner = (
    <div role="status">
      {aiPaused ? (
        <Banner icon={CirclePause}>
          AI paused until tomorrow, so nothing was tagged. Tag followers by hand from a row or by
          selecting them.
        </Banner>
      ) : null}
    </div>
  );

  // A new creator: nothing imported or added yet.
  if (counts.all === 0) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="sr-only">Followers</h1>
        <PeopleTabs />
        <EmptyState
          icon={Users}
          title="No followers yet"
          body="Import the people who comment on or message you (paste a list or a CSV file), then sort them into communities."
          action={
            <div className="flex flex-wrap justify-center gap-3">
              {importButton}
              <Button
                variant="secondary"
                size="md"
                icon={<UserPlus />}
                onClick={() => setAdding(true)}
              >
                Add by hand
              </Button>
            </div>
          }
          className="min-h-[536px] glass-strong rounded-panel"
        />
        {panels}
      </div>
    );
  }

  const communityOptions = [
    { value: ALL, label: 'All' },
    { value: UNTAGGED, label: 'Untagged' },
    ...active.map((c) => ({ value: c.slug, label: c.name })),
  ];
  const filtered = urlQ.trim() !== '' || community !== ALL || joined !== ALL;

  return (
    <div aria-busy={followers.isFetching} className="flex flex-col gap-4">
      <h1 className="sr-only">Followers</h1>
      <PeopleTabs />
      {pausedBanner}
      <Toolbar
        title={
          <>
            Followers <span className="ml-1 text-ink-soft tabular-nums">{formatNumber(total)}</span>
          </>
        }
        start={
          <>
            {importButton}
            <Button
              variant="secondary"
              surface="glass"
              size="md"
              icon={<UserPlus />}
              onClick={() => setAdding(true)}
            >
              Add<span className="max-sm:hidden"> follower</span>
            </Button>
          </>
        }
        end={
          <>
            <SearchSquare
              value={q}
              onChange={setQ}
              label="Search followers"
              placeholder="Name, handle, email or note"
            />
            <Select
              label="Community"
              showLabel
              options={communityOptions}
              value={community}
              onValueChange={(value) =>
                set({ community: value === ALL ? null : value, page: null })
              }
            />
            <Select
              label="Joined"
              showLabel
              options={JOINED_OPTIONS}
              value={joined}
              onValueChange={(value) => set({ joined: value === ALL ? null : value, page: null })}
            />
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <CountChips
          label="Filter followers"
          className="min-w-0 flex-1"
          chips={[
            {
              key: 'all',
              label: 'All followers',
              count: counts.all,
              active: community === ALL && joined === ALL,
              onSelect: () => set({ community: null, joined: null, page: null }),
            },
            {
              key: 'untagged',
              label: 'Untagged',
              count: counts.untagged,
              active: community === UNTAGGED,
              onSelect: () => set({ community: UNTAGGED, joined: null, page: null }),
            },
            {
              key: 'joined',
              label: 'Joined your space',
              count: counts.joined,
              active: joined === 'yes' && community === ALL,
              onSelect: () => set({ community: null, joined: 'yes', page: null }),
            },
          ]}
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="secondary"
            surface="glass"
            size="md"
            icon={<Sparkles />}
            loading={autoTag.isPending}
            disabled={active.length === 0 || counts.untagged === 0}
            onClick={runAutoTag}
          >
            Auto-tag with AI
          </Button>
          <ExportCsvMenu kind="followers" />
        </div>
      </div>

      {picked.length ? (
        <BulkBar
          count={picked.length}
          communities={active}
          busy={tag.isPending}
          onClear={() => setSelection({ key: filterKey, ids: [] })}
          onTag={(communityId, action) =>
            tag.mutate(
              { followerIds: picked, communityId, action },
              {
                onSuccess: ({ updated }) => {
                  const name = active.find((c) => c.id === communityId)?.name ?? 'the community';
                  toastSuccess(
                    `${action === 'add' ? 'Added' : 'Removed'} ${formatNumber(updated)} ${pluralize(updated, 'follower')} ${action === 'add' ? 'to' : 'from'} ${name}.`,
                  );
                  setSelection({ key: filterKey, ids: [] });
                },
              },
            )
          }
        />
      ) : null}

      <FollowersTable
        rows={followers.items}
        now={now}
        selectedId={open?.id ?? null}
        picked={picked}
        onPick={pick}
        hrefFor={(row) =>
          routes.dashboard.followers({
            q: urlQ.trim() || undefined,
            community: community === ALL ? undefined : community,
            item: row.id,
          })
        }
        onOpen={(row) => set({ item: row.id }, { push: openId === null })}
        empty={
          <EmptyState
            icon={Users}
            title="No followers match"
            body={
              filtered
                ? 'Try another name or handle, or clear the search and filters.'
                : 'Nobody on this page.'
            }
            action={
              filtered ? (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setQ('');
                    set({ q: null, community: null, joined: null, page: null });
                  }}
                >
                  Clear search and filters
                </Button>
              ) : undefined
            }
            className="min-h-[536px]"
          />
        }
      />
      <Pagination
        page={followers.page}
        pageCount={followers.pageCount}
        onPageChange={followers.goTo}
        label="Follower pages"
      />
      {panels}
    </div>
  );
}

/** Shown while rows are ticked: add them to, or remove them from, one community. */
function BulkBar({
  count,
  communities,
  busy,
  onTag,
  onClear,
}: {
  count: number;
  communities: StudioCommunity[];
  busy: boolean;
  onTag: (communityId: string, action: 'add' | 'remove') => void;
  onClear: () => void;
}) {
  const [target, setTarget] = useState(communities[0]?.id ?? '');
  const chosen = communities.some((c) => c.id === target) ? target : (communities[0]?.id ?? '');

  return (
    <section
      aria-label="Selected followers"
      className="glass flex flex-wrap items-center gap-3 rounded-full p-4 max-sm:rounded-panel"
    >
      <p aria-live="polite" className="pl-2 text-label-strong text-ink tabular-nums">
        {formatNumber(count)} selected
      </p>
      {communities.length ? (
        <div className="ml-auto flex flex-wrap items-center gap-3">
          <Select
            label="Community"
            showLabel
            options={communities.map((c) => ({ value: c.id, label: c.name }))}
            value={chosen}
            onValueChange={setTarget}
          />
          <Button
            variant="secondary"
            surface="glass"
            size="md"
            icon={<Plus />}
            disabled={busy}
            onClick={() => onTag(chosen, 'add')}
          >
            Add to community
          </Button>
          <Button
            variant="secondary"
            surface="glass"
            size="md"
            icon={<Minus />}
            disabled={busy}
            onClick={() => onTag(chosen, 'remove')}
          >
            Remove from community
          </Button>
        </div>
      ) : (
        <p className="ml-auto text-small text-ink-soft">Add a community first to tag followers.</p>
      )}
      <Button variant="ghost" surface="glass" aria-label="Clear selection" onClick={onClear}>
        <X />
      </Button>
    </section>
  );
}
