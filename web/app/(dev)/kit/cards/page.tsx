'use client';

import {
  type InboxItem,
  PITCH_STATUS_LABELS,
  PITCH_TYPE_LABELS,
  type StudioCommunity,
} from '@fellow-owners/shared';
import { Archive, Eye, Inbox, Lightbulb, Users } from 'lucide-react';
import { notFound } from 'next/navigation';
import type * as React from 'react';
import { useState } from 'react';
import { AvatarInitials } from '@/components/shared/avatar-initials';
import {
  BriefingSkeleton,
  ChartCardSkeleton,
  CommunityCardSkeleton,
  IdeaCardSkeleton,
  StatCardSkeleton,
  TableSkeleton,
} from '@/components/shared/card-skeletons';
import { ChartCard } from '@/components/shared/chart-card';
import { CommunityCard } from '@/components/shared/community-card';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { DataTable, type DataTableColumn } from '@/components/shared/data-table';
import { DONUT_HEIGHT, DonutChart } from '@/components/shared/donut-chart';
import { FitPill } from '@/components/shared/fit-pill';
import { IdeaCard } from '@/components/shared/idea-card';
import { LineChart } from '@/components/shared/line-chart';
import { SidePanel } from '@/components/shared/side-panel';
import { StatCard } from '@/components/shared/stat-card';
import { StatusPill } from '@/components/shared/status-pill';
import { Button } from '@/components/ui/button';
import { fixtures } from '@/lib/fixtures';
import { formatChange, formatDate, formatNumber } from '@/lib/format';
import { routes } from '@/lib/routes';
import { toastSuccess } from '@/lib/toast';

// TEMPORARY dev-only gallery of the shared cards, charts and tables on fixtures; delete before release.

const { overview, communities, ideas, inbox, inboxDetail, feed, studioSpace } = fixtures;
const { stats, activity } = overview;

const last = activity[activity.length - 1];
const previous = activity[activity.length - 2];
const joins = formatChange(((last.joins - previous.joins) / previous.joins) * 100);

const mix = overview.inboxMix.filter((slice) => slice.key !== 'spam');
const ranked = [...mix].sort((a, b) => b.count - a.count);
const mixLegend = [ranked[0].label, ranked[1].label, 'Everything else'].map((label, i) => ({
  label,
  color: `var(--chart-${i + 1})`,
}));

const DIGEST = 'Three new trip ideas this week; the Lisbon guide found its photographer.';

function Panel({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className="mb-4 text-h2 text-ink">
        {title}
      </h2>
      <div className="glass flex flex-col gap-5 p-4 sm:p-6">{children}</div>
    </section>
  );
}

export default function CardsKitPage() {
  if (process.env.NODE_ENV === 'production') notFound();

  const [pitch, setPitch] = useState<InboxItem>(inbox.items[0]);
  const [pitchOpen, setPitchOpen] = useState(false);
  const [editing, setEditing] = useState<StudioCommunity>(communities[0]);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [joined, setJoined] = useState<string[]>(['budget-travel']);
  const [picked, setPicked] = useState<string[]>(['fitness-crew']);

  const openPitch = (item: InboxItem) => {
    setPitch(item);
    setPitchOpen(true);
  };

  const inboxColumns: DataTableColumn<InboxItem>[] = [
    {
      key: 'sender',
      header: 'Sender',
      primary: true,
      leading: (row) => (
        <AvatarInitials name={row.sender.name} image={row.sender.image} size={28} />
      ),
      cell: (row) => row.sender.name,
    },
    {
      key: 'type',
      header: 'Type',
      cell: (row) => <span className="text-ink-soft">{PITCH_TYPE_LABELS[row.type]}</span>,
    },
    {
      key: 'summary',
      header: 'Summary',
      hideBelow: 'lg',
      grow: true,
      cell: (row) => row.ai.summary ?? row.subject,
    },
    {
      key: 'fit',
      header: 'Fit',
      cell: (row) =>
        row.ai.fitScore != null && row.ai.fitReason ? (
          <FitPill score={row.ai.fitScore} reason={row.ai.fitReason} />
        ) : null,
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => <StatusPill status={row.status} label={PITCH_STATUS_LABELS[row.status]} />,
    },
    { key: 'date', header: 'Date', hideBelow: 'lg', cell: (row) => formatDate(row.createdAt) },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      hideBelow: 'md',
      align: 'end',
      width: '64px',
      cell: (row) => (
        <Button
          variant="ghost"
          surface="white"
          className="text-ink-soft"
          aria-label={`Open idea from ${row.sender.name}`}
          onClick={() => openPitch(row)}
        >
          <Eye />
        </Button>
      ),
    },
  ];

  return (
    <main className="mx-auto flex max-w-[1240px] flex-col gap-10 px-4 py-8 sm:px-6">
      <header>
        <h1 className="text-display text-ink">Cards kit</h1>
        <p className="mt-1 text-body text-ink-soft">
          Dev-only gallery of the shared cards, charts and tables on demo fixtures.
        </p>
      </header>

      <Panel id="today" title="Today">
        <div className="grid gap-5 lg:grid-cols-3">
          <StatCard
            tint="peach"
            icon={Users}
            value={stats.members.value}
            label="Fans"
            changePct={stats.members.changePct}
            href={routes.dashboard.people()}
          />
          <StatCard
            tint="lavender"
            icon={Lightbulb}
            value={stats.ideasThisWeek.value}
            label="Ideas this week"
            changePct={stats.ideasThisWeek.changePct}
            href={routes.dashboard.ideas()}
          />
          <StatCard
            tint="aqua"
            icon={Inbox}
            value={stats.opportunitiesWaiting.value}
            label="Opportunities waiting"
            changePct={stats.opportunitiesWaiting.changePct}
            href={routes.dashboard.inbox()}
          />
        </div>

        <ChartCard
          title="Fanbase activity"
          legend={[
            { label: 'Joins', color: 'var(--chart-1)' },
            { label: 'Ideas', color: 'var(--chart-2)' },
          ]}
          summary={`Joins ${joins.text} on last week: ${formatNumber(last.joins)} in the week of ${formatDate(last.weekStart)}.`}
          data={{
            columns: ['Week of', 'Joins', 'Ideas'],
            rows: activity.map((week) => [formatDate(week.weekStart), week.joins, week.ideas]),
          }}
        >
          <LineChart
            data={activity}
            xKey="weekStart"
            xFormat="date"
            series={[
              { key: 'joins', label: 'Joins' },
              { key: 'ideas', label: 'Ideas' },
            ]}
            label="Joins and ideas per week over the last 12 weeks"
          />
        </ChartCard>

        <div className="grid gap-5 md:grid-cols-2">
          <ChartCard
            title="Inbox mix"
            legend={mixLegend}
            summary={`${mix.map((slice) => `${slice.label} ${slice.count}`).join(', ')}.`}
            data={{
              columns: ['Type', 'Messages'],
              rows: mix.map((slice) => [slice.label, slice.count]),
            }}
          >
            <DonutChart
              label="Inbox mix"
              totalLabel="messages"
              segments={mix.map((slice) => ({ label: slice.label, value: slice.count }))}
            />
          </ChartCard>

          <section
            aria-labelledby="top-ideas-title"
            className="rounded-3xl border border-white/70 bg-white/60 p-6 transition-colors duration-150 ease-out-quart hover:bg-white/80"
          >
            <h2 id="top-ideas-title" className="text-h2 text-ink">
              Top ideas
            </h2>
            <DataTable
              variant="compact"
              caption="Top ideas"
              className="mt-4"
              rows={ideas.items.slice(0, 5)}
              getRowId={(row) => row.id}
              getRowHref={(row) => routes.dashboard.ideas({ item: row.id })}
              columns={[
                {
                  key: 'idea',
                  header: 'Idea',
                  primary: true,
                  grow: true,
                  cell: (row) => row.title,
                },
                {
                  key: 'fit',
                  header: 'Fit',
                  cell: (row) =>
                    row.ai.fitScore != null && row.ai.fitReason ? (
                      <FitPill score={row.ai.fitScore} reason={row.ai.fitReason} />
                    ) : null,
                },
                {
                  key: 'use',
                  header: 'Would use',
                  align: 'end',
                  cell: (row) => formatNumber(row.useCount),
                },
              ]}
            />
          </section>
        </div>
      </Panel>

      <Panel id="inbox" title="Data table and side panel">
        <DataTable
          caption="Inbox"
          rows={inbox.items.slice(0, 8)}
          getRowId={(row) => row.id}
          getRowHref={(row) => routes.dashboard.inbox({ item: row.id })}
          onRowOpen={openPitch}
          selectedId={pitchOpen ? pitch.id : null}
          columns={inboxColumns}
        />
      </Panel>

      <Panel id="communities" title="Community cards">
        <div className="grid gap-5 sm:grid-cols-2">
          {communities.map((community, i) => (
            <CommunityCard
              key={community.id}
              variant="studio"
              community={i === 0 ? { ...community, digest: DIGEST } : community}
              onEdit={() => {
                setEditing(community);
                setEditOpen(true);
              }}
            />
          ))}
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          {communities.slice(0, 2).map((community) => (
            <CommunityCard
              key={community.id}
              variant="bio"
              community={community}
              joined={joined.includes(community.slug)}
              onJoin={() => {
                setJoined((list) => [...list, community.slug]);
                toastSuccess(`You joined ${community.name}.`);
              }}
            />
          ))}
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          {communities.slice(3, 5).map((community) => (
            <CommunityCard
              key={community.id}
              variant="select"
              community={community}
              selected={picked.includes(community.slug)}
              onSelectedChange={(on) =>
                setPicked((list) =>
                  on ? [...list, community.slug] : list.filter((slug) => slug !== community.slug),
                )
              }
              suggestion={
                community.slug === 'food-finds'
                  ? { reason: 'Matches your intro: solo traveler who loves street food' }
                  : undefined
              }
            />
          ))}
        </div>
      </Panel>

      <Panel id="ideas" title="Idea cards">
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {ideas.items.slice(0, 3).map((idea) => (
            <IdeaCard
              key={idea.id}
              variant="creator"
              post={idea}
              href={routes.dashboard.ideas({ item: idea.id })}
              promoteHref={routes.dashboard.promoteComposer(idea.id)}
            />
          ))}
          {feed.items.slice(0, 2).map((post) => (
            <IdeaCard
              key={post.id}
              variant="fan"
              post={post}
              href={routes.fan.post(studioSpace.handle, post.id)}
            />
          ))}
        </div>
      </Panel>

      <Panel id="skeletons" title="Skeletons">
        <div className="grid gap-5 lg:grid-cols-3">
          <StatCardSkeleton tint="peach" />
          <StatCardSkeleton tint="lavender" />
          <StatCardSkeleton tint="aqua" />
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <ChartCardSkeleton height={DONUT_HEIGHT} />
          <BriefingSkeleton />
        </div>
        <TableSkeleton />
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <IdeaCardSkeleton />
          <IdeaCardSkeleton variant="fan" />
          <CommunityCardSkeleton tint="lavender" />
        </div>
        <div className="rounded-3xl border border-white/70 bg-white/60 p-6">
          <TableSkeleton variant="compact" rows={3} columns={3} />
        </div>
      </Panel>

      <SidePanel
        open={pitchOpen}
        onOpenChange={setPitchOpen}
        title={pitch.sender.name}
        status={<StatusPill status={pitch.status} label={PITCH_STATUS_LABELS[pitch.status]} />}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => toastSuccess(`${pitch.sender.name} is on your shortlist.`)}
            >
              Shortlist
            </Button>
            <Button className="flex-1" onClick={() => toastSuccess('Reply sent.')}>
              Send reply
            </Button>
          </>
        }
      >
        <p className="text-small text-ink-soft">
          {PITCH_TYPE_LABELS[pitch.type]} · {formatDate(pitch.createdAt)}
        </p>
        <h3 className="mt-4 text-label text-ink">{pitch.subject}</h3>
        <p className="mt-2 max-w-[68ch] text-body text-ink">
          {pitch.id === inboxDetail.id ? inboxDetail.body : pitch.excerpt}
        </p>
        {pitch.ai.fitScore != null && pitch.ai.fitReason ? (
          <div className="mt-6 flex items-start gap-3">
            <FitPill score={pitch.ai.fitScore} reason={pitch.ai.fitReason} />
            <p className="text-small text-ink-soft">{pitch.ai.fitReason}</p>
          </div>
        ) : null}
      </SidePanel>

      <SidePanel
        open={editOpen}
        onOpenChange={setEditOpen}
        title={`Edit ${editing.name}`}
        footer={
          <Button variant="destructive" icon={<Archive />} onClick={() => setConfirmOpen(true)}>
            Archive community
          </Button>
        }
      >
        <p className="text-body text-ink">
          {formatNumber(editing.memberCount)} fans, {formatNumber(editing.postCount)} posts.
        </p>
      </SidePanel>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Archive ${editing.name}?`}
        body="Fans keep their posts, but nobody new can join. You can restore it from Settings."
        confirmLabel="Archive community"
        onConfirm={() => {
          setEditOpen(false);
          toastSuccess(`${editing.name} is archived.`);
        }}
      />
    </main>
  );
}
