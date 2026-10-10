'use client';

import type { PersonRow } from '@fellow-owners/shared';
import { MoreHorizontal, UserMinus, UserRound, Users } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { AvatarInitials } from '@/components/shared/avatar-initials';
import { TableSkeleton } from '@/components/shared/card-skeletons';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { DataTable, type DataTableColumn } from '@/components/shared/data-table';
import { EmptyState } from '@/components/shared/empty-state';
import { Pagination } from '@/components/shared/pagination';
import { SearchSquare, Toolbar } from '@/components/shared/toolbar';
import { Button } from '@/components/ui/button';
import { Menu, MenuContent, MenuItem, MenuLinkItem, MenuTrigger } from '@/components/ui/menu';
import { useCommunityMembers } from '@/hooks/queries/use-communities';
import { useRemovePerson } from '@/hooks/queries/use-people';
import { useDebounce } from '@/hooks/use-debounce';
import { formatDate } from '@/lib/format';
import { routes } from '@/lib/routes';
import { toastSuccess } from '@/lib/toast';
import { QueryError } from './query-error';

export interface CommunityMembersProps {
  slug: string;
  communityName: string;
}

/**
 * The Members tab of a community (DESIGN.md refs 3cd1c6, cda9bd): a glass toolbar with search, the full
 * members table (name with avatar, headline, skills, joined, row menu) and glass pagination. The name
 * links to the member on People; the row menu adds Remove from community, confirmed in a dialog.
 */
export function CommunityMembers({ slug, communityName }: CommunityMembersProps) {
  const [search, setSearch] = useState('');
  const needle = useDebounce(search.trim(), 300);
  const members = useCommunityMembers(slug, needle);
  const remove = useRemovePerson();
  // Kept after closing, so the dialog's words hold while it animates out.
  const [removing, setRemoving] = useState<PersonRow | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const columns: DataTableColumn<PersonRow>[] = [
    {
      key: 'name',
      header: 'Name',
      primary: true,
      leading: (row) => <AvatarInitials name={row.name} image={row.image} size={28} />,
      cell: (row) => row.name,
    },
    {
      key: 'headline',
      header: 'Headline',
      grow: true,
      cell: (row) => <span className="text-ink-soft">{row.headline ?? 'No headline yet'}</span>,
    },
    {
      key: 'skills',
      header: 'Interests',
      hideBelow: 'lg',
      cell: (row) => (
        <span className="text-ink-soft">{row.skills.slice(0, 3).join(', ') || 'None listed'}</span>
      ),
    },
    {
      key: 'joined',
      header: 'Joined',
      hideBelow: 'md',
      cell: (row) => <span className="text-ink-soft">{formatDate(row.joinedAt)}</span>,
    },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      hideBelow: 'md',
      align: 'end',
      width: '64px',
      cell: (row) => (
        <Menu>
          <MenuTrigger
            render={
              <Button
                variant="ghost"
                surface="white"
                className="text-ink-soft"
                aria-label={`More actions for ${row.name}`}
              />
            }
          >
            <MoreHorizontal />
          </MenuTrigger>
          <MenuContent>
            <MenuLinkItem
              render={<Link href={routes.dashboard.people({ item: row.membershipId })} />}
              icon={<UserRound />}
            >
              View profile
            </MenuLinkItem>
            <MenuItem
              destructive
              icon={<UserMinus />}
              onClick={() => {
                setRemoving(row);
                setConfirmOpen(true);
              }}
            >
              Remove from community
            </MenuItem>
          </MenuContent>
        </Menu>
      ),
    },
  ];

  return (
    <>
      <Toolbar
        title="Fans"
        end={
          <SearchSquare
            label="Search fans"
            placeholder="Name, headline or interest"
            value={search}
            onChange={setSearch}
          />
        }
      />
      {members.isError ? (
        <QueryError error={members.error} onRetry={members.refetch} />
      ) : members.isLoading ? (
        <TableSkeleton columns={5} />
      ) : (
        <>
          <DataTable
            caption={`Fans of ${communityName}`}
            columns={columns}
            rows={members.items}
            getRowId={(row) => row.membershipId}
            getRowHref={(row) => routes.dashboard.people({ item: row.membershipId })}
            empty={
              <EmptyState
                icon={Users}
                body={
                  needle
                    ? 'No fans match that search.'
                    : `No fans in ${communityName} yet. They join from your bio link.`
                }
                className="min-h-[240px]"
              />
            }
          />
          <Pagination
            label="Fan pages"
            page={members.page}
            pageCount={members.pageCount}
            onPageChange={members.goTo}
            className="self-center"
          />
        </>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Remove ${removing?.name ?? 'this fan'} from ${communityName}?`}
        body="They keep their account and their posts, and can rejoin from your bio link."
        confirmLabel="Remove from community"
        icon={<UserMinus />}
        onConfirm={() => {
          if (!removing) return;
          const { name } = removing;
          remove.mutate(removing.membershipId, {
            onSuccess: () => toastSuccess(`${name} is no longer in ${communityName}.`),
          });
        }}
      />
    </>
  );
}
