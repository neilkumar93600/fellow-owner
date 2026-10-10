'use client';

import type { PersonRow, StudioCommunity } from '@fellow-owners/shared';
import { ExternalLink, LayoutGrid, Rows3, Sparkles, UserMinus, Users } from 'lucide-react';
import type * as React from 'react';
import { useMemo, useState } from 'react';
import { ExportCsvMenu } from '@/components/dashboard/export-csv-link';
import { AvatarInitials } from '@/components/shared/avatar-initials';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { Pagination } from '@/components/shared/pagination';
import { SegmentedPill } from '@/components/shared/segmented-pill';
import { SidePanel } from '@/components/shared/side-panel';
import { SearchSquare, Toolbar } from '@/components/shared/toolbar';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { formatDate, formatNumber } from '@/lib/format';
import { routes } from '@/lib/routes';
import { toastSuccess } from '@/lib/toast';
import { PeopleCards } from './people-cards';
import { CommunityChips, type CommunityIcons, PeopleTable, SkillChips } from './people-table';
import { PeopleTabs } from './people-tabs';
import { PersonCommunities } from './person-communities';
import { RisingStrip } from './rising-strip';
import { SpotlightPanel } from './spotlight-panel';

const ALL = 'all';

export type PeopleViewMode = 'cards' | 'table';
const VIEW_OPTIONS = [
  { value: 'cards', label: 'Cards', icon: LayoutGrid },
  { value: 'table', label: 'Table', icon: Rows3 },
] as const;

export interface PeopleViewProps {
  rows: PersonRow[];
  rising: PersonRow[];
  total: number;
  communities: StudioCommunity[];
  /** The search box's text (the list follows it a beat later). */
  q: string;
  /** A community slug, or 'all'. */
  community: string;
  page: number;
  pageCount: number;
  /** ?item=: the fan whose panel is open. */
  openId: string | null;
  /** ?spotlight=: the fan whose spotlight panel is open. */
  spotlightId: string | null;
  /** Cards (default) or the table. */
  view: PeopleViewMode;
  onView: (view: PeopleViewMode) => void;
  /** Opens (a fan) or closes (null) the spotlight panel. */
  onSpotlight: (row: PersonRow | null) => void;
  /** The list is refetching after a search, filter or page change. */
  busy?: boolean;
  /** The page's clock, so relative dates hydrate the same on server and client. */
  now: number;
  onSearch: (value: string) => void;
  onFilter: (value: string) => void;
  onPage: (page: number) => void;
  onOpen: (row: PersonRow) => void;
  onClose: () => void;
  /** Removes the member; resolves once the lists have refreshed. */
  onRemove: (row: PersonRow) => Promise<unknown>;
}

/**
 * Fans: the Rising strip, the toolbar with search, a community filter and a Cards or Table toggle, the
 * fans with pagination, the fan side panel and the Spotlight panel. State lives in the URL and the
 * queries (PeopleContainer); this renders it.
 */
export function PeopleView({
  rows,
  rising,
  total,
  communities,
  q,
  community,
  page,
  pageCount,
  openId,
  spotlightId,
  view,
  onView,
  onSpotlight,
  busy,
  now,
  onSearch: search,
  onFilter: filter,
  onPage: turn,
  onOpen: open,
  onClose: close,
  onRemove,
}: PeopleViewProps) {
  const [shown, setShown] = useState<PersonRow | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const icons = useMemo<CommunityIcons>(
    () => Object.fromEntries(communities.map((c) => [c.slug, c.icon])),
    [communities],
  );
  const options = useMemo(
    () => [
      { value: ALL, label: 'All' },
      ...communities.filter((c) => !c.archivedAt).map((c) => ({ value: c.slug, label: c.name })),
    ],
    [communities],
  );

  // ponytail: a deep-linked ?item= opens once its row is on the shown page or in the rising strip.
  const person = (openId && [...rows, ...rising].find((p) => p.membershipId === openId)) || null;
  // Keep the last member while the panel animates out, so its title does not blank.
  if (person && person !== shown) setShown(person);

  const emptyState = (
    <EmptyState
      icon={Users}
      title="No fans match"
      body="Try another name or topic, or clear the search and filter."
      action={
        <Button
          variant="secondary"
          surface="glass"
          onClick={() => {
            search('');
            filter(ALL);
          }}
        >
          Clear search and filter
        </Button>
      }
      className="min-h-[360px]"
    />
  );

  const spotlightPerson =
    (spotlightId && [...rows, ...rising].find((p) => p.membershipId === spotlightId)) || null;

  const remove = async () => {
    if (!shown) return;
    try {
      await onRemove(shown);
    } catch {
      return; // the hook toasted the error with a retry; keep the panel open
    }
    close();
    toastSuccess(`${shown.name} is no longer in your space.`);
  };

  return (
    <div aria-busy={busy} className="flex flex-col gap-4">
      <h1 className="sr-only">Fans</h1>
      <PeopleTabs />
      <RisingStrip people={rising} onOpen={open} />
      <Toolbar
        title={
          <>
            Fans <span className="ml-1 text-ink-soft tabular-nums">{formatNumber(total)}</span>
          </>
        }
        end={
          <>
            <SegmentedPill
              label="Fans view"
              options={VIEW_OPTIONS}
              value={view}
              onChange={onView}
            />
            <SearchSquare
              value={q}
              onChange={search}
              label="Search fans"
              placeholder="Name, interest or headline"
            />
            <Select
              label="Community"
              showLabel
              options={options}
              value={community}
              onValueChange={filter}
            />
            <ExportCsvMenu kind="people" />
          </>
        }
      />
      {view === 'cards' ? (
        <PeopleCards
          rows={rows}
          icons={icons}
          now={now}
          onOpen={open}
          onSpotlight={onSpotlight}
          empty={emptyState}
        />
      ) : (
        <PeopleTable
          rows={rows}
          icons={icons}
          now={now}
          selectedId={person?.membershipId ?? null}
          hrefFor={(row) =>
            routes.dashboard.people({
              q: q.trim(),
              community: community === ALL ? undefined : community,
              item: row.membershipId,
            })
          }
          onOpen={open}
          onSpotlight={onSpotlight}
          empty={emptyState}
        />
      )}
      <Pagination page={page} pageCount={pageCount} onPageChange={turn} label="Fan pages" />

      <SidePanel
        open={person !== null}
        onOpenChange={(next) => {
          if (!next) close();
        }}
        title={
          shown ? (
            <span className="flex items-center gap-3">
              <AvatarInitials name={shown.name} image={shown.image} size={40} />
              {shown.name}
            </span>
          ) : null
        }
        footer={
          <>
            <Button icon={<Sparkles />} onClick={() => shown && onSpotlight(shown)}>
              Spotlight
            </Button>
            <Button
              variant="destructive-secondary"
              icon={<UserMinus />}
              onClick={() => setConfirmOpen(true)}
            >
              Remove from space
            </Button>
          </>
        }
      >
        {shown ? <MemberDetails person={shown} icons={icons} communities={communities} /> : null}
      </SidePanel>

      <SpotlightPanel
        membershipId={spotlightId}
        name={spotlightPerson?.name}
        onClose={() => onSpotlight(null)}
      />

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Remove ${shown?.name ?? 'this fan'} from your space?`}
        body="They lose access to every community in your space. Ideas they already shared stay up."
        confirmLabel="Remove from space"
        icon={<UserMinus />}
        onConfirm={remove}
      />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-label-strong text-ink">{title}</h3>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function MemberDetails({
  person,
  icons,
  communities,
}: {
  person: PersonRow;
  icons: CommunityIcons;
  communities: StudioCommunity[];
}) {
  const c = person.contributions;
  const figures = [
    ['Ideas', c.posts],
    ['Comments', c.comments],
    ['Signals received', c.signalsReceived],
    ['Crews joined', c.teams],
  ] as const;

  return (
    <div className="flex flex-col gap-6">
      {person.headline ? (
        <p className="text-body text-ink">{person.headline}</p>
      ) : (
        <p className="text-body text-ink-soft">No headline yet.</p>
      )}

      <Section title="Contributions">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
          {figures.map(([label, value]) => (
            <div key={label}>
              <dt className="text-small text-ink-soft">{label}</dt>
              <dd className="text-count text-ink-soft">{formatNumber(value)}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section title="Interests">
        <SkillChips skills={person.skills} />
      </Section>

      <Section title="Communities">
        <CommunityChips communities={person.communities} icons={icons} />
        <div className="mt-4">
          <PersonCommunities key={person.membershipId} person={person} communities={communities} />
        </div>
      </Section>

      {person.links.length > 0 ? (
        <Section title="Links">
          <ul className="flex flex-col gap-2">
            {person.links.map((link) => (
              <li key={link.url}>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-sm text-body text-ink underline underline-offset-3"
                >
                  {link.label}
                  <ExternalLink aria-hidden="true" strokeWidth={1.5} className="size-4" />
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
                <p className="truncate text-small text-ink-soft">
                  {link.url.replace(/^https?:\/\//, '')}
                </p>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <p className="text-small text-ink-soft">Joined {formatDate(person.joinedAt)}</p>
    </div>
  );
}
