import { INBOX_TAB_LABELS, INBOX_TABS } from '@fellow-owners/shared';
import { CirclePause, Inbox } from 'lucide-react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type * as React from 'react';
import { AvatarInitials, AvatarStack } from '@/components/shared/avatar-initials';
import { Banner } from '@/components/shared/banner';
import { CommunityChip } from '@/components/shared/community-chip';
import { CopyButton } from '@/components/shared/copy-button';
import { EmptyState } from '@/components/shared/empty-state';
import { FitPill } from '@/components/shared/fit-pill';
import { PageHeading } from '@/components/shared/page-heading';
import { SignalButtons } from '@/components/shared/signal-buttons';
import { StatusPill } from '@/components/shared/status-pill';
import { TabBar } from '@/components/shared/tab-bar';
import { type CardTint, TINT_STYLES } from '@/components/shared/tint';
import { Trend } from '@/components/shared/trend';
import { cn } from '@/components/ui/cn';
import { fixtures } from '@/lib/fixtures';
import { AiChipDemo, GlassDemos } from './demos';

// TEMPORARY dev-only gallery of components/shared atoms on their real surfaces; delete before release.
export const metadata: Metadata = { title: 'Atoms kit', robots: { index: false } };

const STATUSES = [
  'new',
  'requested',
  'pending',
  'open',
  'forming_team',
  'shortlisted',
  'accepted',
  'replied',
  'live',
  'building',
  'launched',
  'archived',
  'filtered',
  'draft',
  'unpublished',
  'withdrawn',
  'declined',
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-h2 text-ink">{title}</h2>
      {children}
    </section>
  );
}

export default async function AtomsKitPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (process.env.NODE_ENV === 'production') notFound();
  const { tab } = await searchParams;
  const activeTab = INBOX_TABS.find((t) => t === tab) ?? 'all';

  const { overview, communities, ideas, inbox, inboxFiltered, me, feed } = fixtures;
  const messages = [...inbox.items, ...inboxFiltered.items];
  const high = messages.find((p) => (p.ai.fitScore ?? 0) >= 70);
  const low = messages.find((p) => p.ai.fitScore !== null && p.ai.fitScore < 40);
  const mid = ideas.items.find(
    (i) => i.ai.fitScore !== null && i.ai.fitScore >= 40 && i.ai.fitScore < 70,
  );
  const fits = [high?.ai, mid?.ai, low?.ai].filter((ai) => ai?.fitScore != null && ai.fitReason);
  const team = ideas.items.reduce((a, b) => (b.teamSize > a.teamSize ? b : a));
  const signalled = feed.items.find((p) => p.useCount > 0) ?? feed.items[0];
  const stats: { tint: CardTint; label: string; changePct: number | null }[] = [
    { tint: 'peach', label: 'Fans', changePct: overview.stats.members.changePct },
    {
      tint: 'lavender',
      label: 'Ideas this week',
      changePct: overview.stats.ideasThisWeek.changePct,
    },
    {
      tint: 'aqua',
      label: 'Opportunities waiting',
      changePct: overview.stats.opportunitiesWaiting.changePct,
    },
    { tint: 'white', label: 'Joins today', changePct: -4 },
    { tint: 'peach', label: 'Messages today', changePct: 0 },
  ];

  return (
    <main className="mx-auto flex max-w-[1240px] flex-col gap-10 px-4 py-8 sm:px-6">
      <PageHeading
        title="Atoms kit"
        description="Dev-only gallery of components/shared atoms on the surfaces they live on."
      />

      <Section title="Glass on the aurora">
        <div className="glass flex min-w-0 flex-col gap-4 p-4 sm:p-6">
          <TabBar
            label="Inbox views"
            tabs={INBOX_TABS.map((t) => ({
              href: t === 'all' ? '/kit/atoms' : `/kit/atoms?tab=${t}`,
              label: INBOX_TAB_LABELS[t],
              active: t === activeTab,
            }))}
          />
          <GlassDemos counts={ideas.counts} total={ideas.total} />
        </div>
      </Section>

      <Section title="Pills and chips on white and soft white">
        {['bg-white', 'bg-white/60'].map((surface) => (
          <div key={surface} className={cn('flex flex-col gap-4 rounded-3xl p-4 sm:p-6', surface)}>
            <div className="flex flex-wrap items-center gap-2">
              {STATUSES.map((status) => (
                <StatusPill key={status} status={status} />
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <AiChipDemo />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {fits.map((ai) => (
                <FitPill
                  key={ai?.fitScore}
                  score={ai?.fitScore ?? 0}
                  reason={ai?.fitReason ?? ''}
                />
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {communities.map((c) => (
                <CommunityChip key={c.id} name={c.name} tint={c.tint} icon={c.icon} />
              ))}
            </div>
          </div>
        ))}
      </Section>

      <Section title="Trend rows on their cards">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stats.map((s) => (
            <div
              key={s.label}
              className={cn('flex flex-col gap-3 rounded-3xl p-6', TINT_STYLES[s.tint].card)}
            >
              <p className="text-small-strong text-ink-soft">{s.label}</p>
              <Trend
                changePct={s.changePct}
                descriptor="vs last week"
                surface={s.tint === 'lavender' ? 'lavender' : 'default'}
              />
              <Trend
                changePct={s.changePct}
                descriptor="this month"
                size="small"
                surface={s.tint === 'lavender' ? 'lavender' : 'default'}
              />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Avatars, actions and feedback">
        <div className="flex flex-col gap-6 rounded-3xl bg-white p-4 sm:p-6">
          <div className="flex flex-wrap items-end gap-4">
            <AvatarInitials name={me.space.displayName} image={me.space.avatarUrl} size={96} />
            <AvatarInitials name={me.space.displayName} image={me.space.avatarUrl} online />
            <AvatarInitials name="Priya Shah" size={96} />
            <AvatarInitials name="Priya Shah" size={48} />
            <AvatarInitials name="Tomas Silva" />
            <AvatarInitials name="Sam Okafor" size={28} />
            <AvatarStack people={team.teamPreview} total={team.teamSize} />
            <AvatarStack people={team.teamPreview} total={team.teamSize} max={1} />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <CopyButton value="https://fellowowners.com/mira" label="Copy bio link" />
            <CopyButton
              value="https://fellowowners.com/mira"
              label="Copy bio link"
              variant="secondary"
            />
          </div>
          <div className="flex flex-col gap-4">
            <SignalButtons
              useCount={signalled.useCount}
              buildCount={signalled.buildCount}
              viewerSignals={signalled.viewerSignals}
            />
            <SignalButtons
              useCount={signalled.useCount}
              buildCount={signalled.buildCount}
              viewerSignals={['use']}
              disabled
              disabledReason={`Join ${signalled.community.name} to signal ideas.`}
            />
          </div>
          <Banner icon={CirclePause}>
            AI paused until tomorrow. New items will be analyzed then.
          </Banner>
          <EmptyState
            icon={Inbox}
            tint="peach"
            body="No messages yet. Your bio link has a Send Mira an idea button."
            action={
              <CopyButton
                value="https://fellowowners.com/mira"
                label="Copy bio link"
                variant="secondary"
              />
            }
          />
          <PageHeading
            level={2}
            title="Food Finds"
            description="Small family-run spots, tried and tasted by fans."
            actions={
              <CopyButton
                value="https://fellowowners.com/mira/c/food-finds"
                label="Copy link"
                variant="secondary"
              />
            }
          />
        </div>
      </Section>
    </main>
  );
}
