'use client';

import type { IdeaItem } from '@fellow-owners/shared';
import { POST_TYPE_LABELS } from '@fellow-owners/shared';
import { ArrowLeft, Lightbulb, Pencil } from 'lucide-react';
import Link from 'next/link';
import { notFound, useRouter } from 'next/navigation';
import { useState } from 'react';
import { TableSkeleton } from '@/components/shared/card-skeletons';
import { DataTable, type DataTableColumn } from '@/components/shared/data-table';
import { EmptyState } from '@/components/shared/empty-state';
import { FitPill } from '@/components/shared/fit-pill';
import { Pagination } from '@/components/shared/pagination';
import { StatusPill } from '@/components/shared/status-pill';
import { TabBar } from '@/components/shared/tab-bar';
import { COMMUNITY_ICON, cardTint, TINT_STYLES } from '@/components/shared/tint';
import { Trend } from '@/components/shared/trend';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/ui/cn';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useCommunityPosts,
  useStudioCommunity,
  useUpdateCommunity,
} from '@/hooks/queries/use-communities';
import { ApiError } from '@/lib/fetcher';
import { formatDate, formatNumber, pluralize } from '@/lib/format';
import { routes } from '@/lib/routes';
import { toastSuccess } from '@/lib/toast';
import { CommunityActivityPanel } from './community-activity';
import { CommunityPanel } from './community-form';
import { CommunityMembers } from './community-members';
import { QueryError } from './query-error';

export type CommunityTab = 'members' | 'posts';

const postColumns: DataTableColumn<IdeaItem>[] = [
  { key: 'title', header: 'Title', primary: true, grow: true, cell: (post) => post.title },
  {
    key: 'type',
    header: 'Type',
    hideBelow: 'md',
    cell: (post) => <span className="text-ink-soft">{POST_TYPE_LABELS[post.type]}</span>,
  },
  {
    key: 'status',
    header: 'Status',
    cell: (post) => (
      <span className="flex gap-2">
        <StatusPill status={post.status} />
        {post.hidden ? <StatusPill status="hidden" /> : null}
      </span>
    ),
  },
  {
    key: 'fit',
    header: 'Fit',
    cell: (post) =>
      post.ai.fitScore != null && post.ai.fitReason ? (
        <FitPill score={post.ai.fitScore} reason={post.ai.fitReason} />
      ) : null,
  },
  {
    key: 'posted',
    header: 'Posted',
    hideBelow: 'lg',
    cell: (post) => <span className="text-ink-soft">{formatDate(post.createdAt)}</span>,
  },
];

export interface CommunityDetailViewProps {
  slug: string;
  /** From ?tab=, fans by default. */
  tab: CommunityTab;
}

/** The loading shape: back link, header band and a table. */
export function CommunityDetailSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-4">
      <span className="sr-only" role="status">
        Loading community
      </span>
      <Skeleton className="h-10 w-36" />
      <Skeleton className="h-36 rounded-panel" />
      <Skeleton className="h-12 w-64" />
      <TableSkeleton />
    </div>
  );
}

function CommunityPosts({ slug, name }: { slug: string; name: string }) {
  const posts = useCommunityPosts(slug);
  return (
    <section
      aria-labelledby="community-posts-title"
      className="glass rounded-panel p-6 transition-colors duration-150 ease-out-quart hover:bg-white/80"
    >
      <h2 id="community-posts-title" className="text-h2 text-ink">
        Posts
      </h2>
      {posts.isError ? (
        <div className="mt-4">
          <QueryError error={posts.error} onRetry={posts.refetch} />
        </div>
      ) : posts.isLoading ? (
        <TableSkeleton variant="compact" rows={5} columns={5} className="mt-4" />
      ) : (
        <>
          <DataTable
            variant="compact"
            caption={`Posts in ${name}`}
            className="mt-4"
            columns={postColumns}
            rows={posts.items}
            getRowId={(post) => post.id}
            getRowHref={(post) => routes.dashboard.ideas({ item: post.id })}
            empty={
              <EmptyState
                icon={Lightbulb}
                body={`Nothing posted in ${name} yet.`}
                className="min-h-[240px]"
              />
            }
          />
          <div className="mt-4 flex justify-center">
            <Pagination
              label="Post pages"
              page={posts.page}
              pageCount={posts.pageCount}
              onPageChange={posts.goTo}
            />
          </div>
        </>
      )}
    </section>
  );
}

/**
 * /dashboard/communities/{slug}: a back link, the header band in the community's tint (name, fans
 * with their trend, description, Edit), the Fans or Posts tab bar, then the fans table or the
 * posts as compact rows that open in Ideas.
 */
export function CommunityDetailView({ slug, tab }: CommunityDetailViewProps) {
  const router = useRouter();
  const { data, isPending, isError, error, refetch } = useStudioCommunity(slug);
  const update = useUpdateCommunity();
  const [editOpen, setEditOpen] = useState(false);

  if (isPending) return <CommunityDetailSkeleton />;
  if (isError) {
    if (error instanceof ApiError && error.status === 404) notFound();
    return <QueryError error={error} onRetry={() => void refetch()} />;
  }

  const { community } = data;
  const tint = cardTint(community.tint);
  const styles = TINT_STYLES[tint];
  const lavender = tint === 'lavender';
  const Icon = COMMUNITY_ICON[community.icon];
  const base = routes.dashboard.community(community.slug);

  return (
    // relative: the tables' visually hidden text (fit pill words) stays inside main's scroll box instead
    // of stretching the document below the fold.
    <div className="relative flex flex-col gap-4">
      <Link
        href={routes.dashboard.communities()}
        className="press inline-flex h-10 items-center gap-2 self-start rounded-full pr-4 pl-3 text-label text-ink hover:bg-white/60"
      >
        <ArrowLeft aria-hidden="true" strokeWidth={1.5} className="size-5" />
        Communities
      </Link>

      <header
        className={cn(
          'flex flex-col gap-5 rounded-panel p-6 @2xl:flex-row @2xl:items-start @2xl:justify-between',
          styles.card,
        )}
      >
        <div className="flex min-w-0 gap-4">
          <span className={cn('grid size-14 shrink-0 place-items-center rounded-md', styles.tile)}>
            <Icon aria-hidden="true" strokeWidth={1.5} className={cn('size-6', styles.icon)} />
          </span>
          <div className="flex min-w-0 flex-col gap-2">
            <h1 className="text-h1 text-ink">{community.name}</h1>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="text-trend text-ink-soft">
                {formatNumber(community.memberCount)}{' '}
                <span className="font-normal">{pluralize(community.memberCount, 'fan')}</span>
              </span>
              <Trend
                changePct={community.trendPct}
                descriptor="this week"
                surface={lavender ? 'lavender' : 'default'}
              />
            </p>
            {community.description ? (
              <p className="max-w-[68ch] text-body text-ink">{community.description}</p>
            ) : null}
          </div>
        </div>
        <Button
          variant="secondary"
          surface={tint === 'white' ? 'white' : 'card'}
          icon={<Pencil />}
          onClick={() => setEditOpen(true)}
          className="self-start"
        >
          Edit
        </Button>
      </header>

      {community.archivedAt ? null : <CommunityActivityPanel slug={community.slug} />}

      <TabBar
        label={`${community.name} views`}
        tabs={[
          { href: base, label: 'Fans', active: tab === 'members' },
          { href: `${base}?tab=posts`, label: 'Posts', active: tab === 'posts' },
        ]}
      />

      {tab === 'members' ? (
        <CommunityMembers slug={community.slug} communityName={community.name} />
      ) : (
        <CommunityPosts slug={community.slug} name={community.name} />
      )}

      <CommunityPanel
        open={editOpen}
        onOpenChange={setEditOpen}
        community={community}
        onSave={(values) =>
          update.mutate(
            { id: community.id, patch: values },
            { onSuccess: () => toastSuccess(`${values.name} is saved.`) },
          )
        }
        onArchive={() =>
          update.mutate(
            { id: community.id, patch: { archived: true } },
            {
              onSuccess: () => {
                toastSuccess(`${community.name} is archived.`);
                router.push(routes.dashboard.communities());
              },
            },
          )
        }
        onRestore={() =>
          update.mutate(
            { id: community.id, patch: { archived: false } },
            { onSuccess: () => toastSuccess(`${community.name} is restored.`) },
          )
        }
      />
    </div>
  );
}
