import type { CommunityIcon, PersonRow } from '@fellow-owners/shared';
import { Eye, Sparkles } from 'lucide-react';
import type * as React from 'react';
import { AvatarInitials } from '@/components/shared/avatar-initials';
import { CommunityChip } from '@/components/shared/community-chip';
import { DataTable, type DataTableColumn } from '@/components/shared/data-table';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/ui/cn';
import { formatNumber, formatRelative, pluralize } from '@/lib/format';

/** Community icons by slug: people rows carry slug, name and tint only. */
export type CommunityIcons = Record<string, CommunityIcon>;

/** A small frosted chip: Caption ink. */
function Chip({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex h-6 shrink-0 items-center rounded-full bg-white/70 px-2.5 text-caption text-ink ring-1 ring-ink/10 ring-inset',
        className,
      )}
    >
      {children}
    </span>
  );
}

/** "+N" for what did not fit, with the hidden names for screen readers. */
function MoreChip({ names, className }: { names: string[]; className?: string }) {
  if (names.length === 0) return null;
  return (
    <Chip className={className}>
      <span aria-hidden="true">+{names.length}</span>
      <span className="sr-only">and {names.join(', ')}</span>
    </Chip>
  );
}

/** Every skill as a chip (the side panel). */
export function SkillChips({ skills }: { skills: string[] }) {
  if (skills.length === 0)
    return <p className="text-body text-ink-soft">No interests listed yet.</p>;
  return (
    <span className="flex flex-wrap gap-1.5">
      {skills.map((skill) => (
        <Chip key={skill}>{skill}</Chip>
      ))}
    </span>
  );
}

// The table shows up to 3 skills as the content column widens (1 below @5xl, 2 up to @6xl, then 3), so
// the member name keeps its room at 1280 and 1440; each tier has its own "+N".
const CHIP_FROM = ['', 'hidden @5xl:inline-flex', 'hidden @6xl:inline-flex'];
const MORE_AT = ['@5xl:hidden', 'hidden @5xl:inline-flex @6xl:hidden', 'hidden @6xl:inline-flex'];

function TableSkills({ skills }: { skills: string[] }) {
  if (skills.length === 0) return <span className="text-ink-soft">None listed</span>;
  return (
    <span className="flex items-center gap-1.5">
      {skills.slice(0, 3).map((skill, index) => (
        <Chip key={skill} className={CHIP_FROM[index]}>
          {skill}
        </Chip>
      ))}
      {MORE_AT.map((tier, index) => (
        <MoreChip key={tier} names={skills.slice(index + 1)} className={tier} />
      ))}
    </span>
  );
}

/** Community chips; with `max`, the rest fold into "+N" on one line (table cells). */
export function CommunityChips({
  communities,
  icons,
  max,
}: {
  communities: PersonRow['communities'];
  icons: CommunityIcons;
  max?: number;
}) {
  return (
    <span className={cn('flex items-center gap-1.5', max === undefined && 'flex-wrap')}>
      {communities.slice(0, max).map((community) => (
        <CommunityChip
          key={community.slug}
          name={community.name}
          tint={community.tint}
          icon={icons[community.slug] ?? 'users'}
          className="max-w-36"
        />
      ))}
      {max === undefined ? null : (
        <MoreChip names={communities.slice(max).map((community) => community.name)} />
      )}
    </span>
  );
}

export interface PeopleTableProps {
  rows: PersonRow[];
  icons: CommunityIcons;
  /** The page's clock, so relative dates hydrate the same on server and client. */
  now: number;
  /** The member whose side panel is open. */
  selectedId: string | null;
  /** The row's own URL (?item=, keeping the search and filter) for the primary link. */
  hrefFor: (person: PersonRow) => string;
  onOpen: (person: PersonRow) => void;
  onSpotlight?: (person: PersonRow) => void;
  empty: React.ReactNode;
}

/**
 * The Fans table: fan with avatar and headline, interests, communities, activity, joined, and the eye. Phones stack each row to the name, headline and skills.
 */
export function PeopleTable({
  rows,
  icons,
  now,
  selectedId,
  hrefFor,
  onOpen,
  onSpotlight,
  empty,
}: PeopleTableProps) {
  const columns: DataTableColumn<PersonRow>[] = [
    {
      key: 'member',
      // The header's width is the column's floor, so names keep room where the table must scroll.
      header: <span className="inline-block min-w-38">Fan</span>,
      primary: true,
      grow: true,
      leading: (row) => <AvatarInitials name={row.name} image={row.image} size={28} />,
      cell: (row) => (
        <>
          <span className="block truncate">{row.name}</span>
          {row.headline ? (
            // inline-block stops the link's hover underline from running through the headline.
            <span className="block">
              <span className="inline-block max-w-full truncate align-top text-caption font-normal text-ink-soft">
                {row.headline}
              </span>
            </span>
          ) : null}
        </>
      ),
    },
    { key: 'skills', header: 'Interests', cell: (row) => <TableSkills skills={row.skills} /> },
    {
      key: 'communities',
      header: 'Communities',
      hideBelow: 'lg',
      cell: (row) => <CommunityChips communities={row.communities} icons={icons} max={1} />,
    },
    {
      key: 'contributions',
      header: 'Activity',
      hideBelow: 'lg',
      cell: ({ contributions: c }) => (
        <span className="block">
          <span className="block">
            {formatNumber(c.signalsReceived)} {pluralize(c.signalsReceived, 'signal')}
          </span>
          <span className="hidden text-caption font-normal text-ink-soft @5xl:block">
            {formatNumber(c.posts)} {pluralize(c.posts, 'post')} · {formatNumber(c.comments)}{' '}
            {pluralize(c.comments, 'comment')}
          </span>
        </span>
      ),
    },
    {
      key: 'joined',
      header: 'Joined',
      hideBelow: 'lg',
      cell: (row) => <span className="text-ink-soft">{formatRelative(row.joinedAt, now)}</span>,
    },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      hideBelow: 'md',
      align: 'end',
      width: onSpotlight ? '112px' : '64px',
      cell: (row) => (
        <span className="inline-flex">
          {onSpotlight ? (
            <Button
              variant="ghost"
              surface="glass"
              className="text-ink-soft"
              aria-label={`Spotlight ${row.name}`}
              onClick={() => onSpotlight(row)}
            >
              <Sparkles />
            </Button>
          ) : null}
          <Button
            variant="ghost"
            surface="glass"
            className="text-ink-soft"
            aria-label={`View ${row.name}`}
            onClick={() => onOpen(row)}
          >
            <Eye />
          </Button>
        </span>
      ),
    },
  ];

  return (
    <DataTable
      caption="Fans"
      columns={columns}
      rows={rows}
      getRowId={(row) => row.membershipId}
      getRowHref={hrefFor}
      onRowOpen={onOpen}
      selectedId={selectedId}
      empty={empty}
    />
  );
}
