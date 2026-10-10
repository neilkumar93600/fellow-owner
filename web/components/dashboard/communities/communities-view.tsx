'use client';

import type { StudioCommunity } from '@fellow-owners/shared';
import { Flag, Plus, Users } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { CommunityCardSkeleton } from '@/components/shared/card-skeletons';
import { EmptyState } from '@/components/shared/empty-state';
import { TINT_ROTATION } from '@/components/shared/tint';
import { Toolbar } from '@/components/shared/toolbar';
import { Button } from '@/components/ui/button';
import { buttonVariants } from '@/components/ui/button-variants';
import {
  useCreateCommunity,
  useStudioCommunities,
  useUpdateCommunity,
} from '@/hooks/queries/use-communities';
import { formatNumber, pluralize } from '@/lib/format';
import { routes } from '@/lib/routes';
import { toastSuccess } from '@/lib/toast';
import { CommunityActivityCard } from './community-activity';
import { CommunityCoverCard } from './community-cover-card';
import { CommunityPanel, type CommunityValues } from './community-form';
import { QueryError } from './query-error';

/** The card's digest line; until digests ship (P1), this week's post count. */
function digestLine({ digest, postsThisWeek: n }: StudioCommunity): string {
  return digest ?? `${formatNumber(n)} new ${pluralize(n, 'post')} this week`;
}

const GRID = 'grid grid-cols-1 gap-5 @lg:grid-cols-2';

/** The loading shape: the glass toolbar and four cards. */
export function CommunitiesSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-4">
      <span className="sr-only" role="status">
        Loading communities
      </span>
      <Toolbar title="Communities" />
      <div className={GRID}>
        {(['peach', 'lavender', 'aqua', 'white'] as const).map((tint) => (
          <CommunityCardSkeleton key={tint} tint={tint} />
        ))}
      </div>
    </div>
  );
}

/**
 * /dashboard/communities (DESIGN.md Communities recipe, ref c7c71f): a glass toolbar with the title and
 * "Add community +", then the pastel community cards, two columns at most and one on phones. Each card
 * links to its community; the pencil opens the edit panel. Archived ones sit below, to restore.
 */
export function CommunitiesView() {
  const { data: communities, isPending, isError, error, refetch } = useStudioCommunities();
  const create = useCreateCommunity();
  const update = useUpdateCommunity();
  const [panelOpen, setPanelOpen] = useState(false);
  // Kept after closing, so the panel's title holds while it animates out.
  const [editing, setEditing] = useState<StudioCommunity | null>(null);

  if (isPending) return <CommunitiesSkeleton />;
  if (isError) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="sr-only">Communities</h1>
        <Toolbar title="Communities" />
        <QueryError error={error} onRetry={() => void refetch()} />
      </div>
    );
  }

  const live = communities.filter((community) => !community.archivedAt);
  const archived = communities.filter((community) => community.archivedAt);

  function openPanel(community: StudioCommunity | null) {
    setEditing(community);
    setPanelOpen(true);
  }

  function save(values: CommunityValues) {
    if (editing) {
      update.mutate(
        { id: editing.id, patch: values },
        { onSuccess: () => toastSuccess(`${values.name} is saved.`) },
      );
      return;
    }
    create.mutate(
      { ...values, description: values.description ?? undefined },
      {
        onSuccess: () =>
          toastSuccess(`${values.name} is ready. Fans can join it from your bio link.`),
      },
    );
  }

  function setArchived(archive: boolean) {
    if (!editing) return;
    const { id, name } = editing;
    update.mutate(
      { id, patch: { archived: archive } },
      { onSuccess: () => toastSuccess(`${name} is ${archive ? 'archived' : 'restored'}.`) },
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="sr-only">Communities</h1>
      <Toolbar
        title="Communities"
        start={
          <Button
            variant="secondary"
            surface="glass"
            size="md"
            trailingIcon={<Plus />}
            onClick={() => openPanel(null)}
          >
            Add community
          </Button>
        }
        end={
          <Link
            href={routes.dashboard.reports()}
            className={buttonVariants({ variant: 'secondary', surface: 'glass', size: 'md' })}
          >
            <Flag aria-hidden="true" className="size-4" />
            Reports
          </Link>
        }
      />

      {live.length ? (
        <ul className={GRID}>
          {live.map((community) => (
            <li key={community.id} className="flex min-w-0">
              <CommunityCoverCard
                community={community}
                digest={digestLine(community)}
                onEdit={() => openPanel(community)}
                className="flex-1"
              />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={Users}
          body="No communities yet. Add one so fans have somewhere to post."
          className="min-h-[248px]"
        />
      )}

      {live.length ? <CommunityActivityCard /> : null}

      {archived.length ? (
        <section aria-labelledby="archived-communities" className="flex flex-col gap-4">
          <h2 id="archived-communities" className="text-h2 text-ink">
            Archived
          </h2>
          <ul className={GRID}>
            {archived.map((community) => (
              <li key={community.id} className="flex min-w-0">
                <CommunityCoverCard
                  community={community}
                  digest={digestLine(community)}
                  onEdit={() => openPanel(community)}
                  className="flex-1 opacity-70"
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <CommunityPanel
        open={panelOpen}
        onOpenChange={setPanelOpen}
        community={editing}
        defaultTint={TINT_ROTATION[communities.length % TINT_ROTATION.length]}
        onSave={save}
        onArchive={() => setArchived(true)}
        onRestore={() => setArchived(false)}
      />
    </div>
  );
}
