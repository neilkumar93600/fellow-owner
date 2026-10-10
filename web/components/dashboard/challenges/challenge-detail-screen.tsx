'use client';

import type { ChallengeShortlistItem, ChallengeSummary, IdeaItem } from '@fellow-owners/shared';
import { ArrowLeft, CalendarClock, Flag, Sparkles, TriangleAlert, Trophy } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { AvatarInitials } from '@/components/shared/avatar-initials';
import { CommunityChip } from '@/components/shared/community-chip';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { GlassPanel } from '@/components/shared/glass-panel';
import { MatchLabel } from '@/components/shared/match-label';
import { Button } from '@/components/ui/button';
import { buttonVariants } from '@/components/ui/button-variants';
import { cn } from '@/components/ui/cn';
import { Skeleton } from '@/components/ui/skeleton';
import { useChallenge, useCloseChallenge, usePickWinner } from '@/hooks/queries/use-challenges';
import { useStudioCommunities } from '@/hooks/queries/use-communities';
import { ApiError } from '@/lib/fetcher';
import { formatNumber, pluralize } from '@/lib/format';
import { routes } from '@/lib/routes';
import { errorMessage, toastSuccess } from '@/lib/toast';
import { ChallengeCommunity, CountdownPill } from './challenge-bits';
import { useNow } from './use-now';

const dueFormat = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

const backLink = (
  <Link
    href={routes.dashboard.challenges()}
    className={buttonVariants({ variant: 'secondary', size: 'md' })}
  >
    <ArrowLeft aria-hidden className="size-4" />
    All challenges
  </Link>
);

/**
 * One challenge: its header (community, countdown, the prompt, due date), the AI shortlist with the
 * reason for each pick once it is closed, and every entry as a card with a match label. Open shows the
 * coral Close and shortlist; closed shows Pick winner on each shortlisted entry; a winner leads to its
 * Spotlight composer.
 */
export function ChallengeDetailScreen({ id }: { id: string }) {
  const challenge = useChallenge(id);
  const communities = useStudioCommunities();
  const now = useNow();

  if (challenge.error instanceof ApiError && challenge.error.status === 404) {
    return (
      <EmptyState
        icon={Trophy}
        body="This challenge was not found in your studio."
        action={backLink}
        className="glass min-h-80 rounded-panel"
      />
    );
  }
  if (challenge.isError && !challenge.data) {
    return (
      <EmptyState
        icon={TriangleAlert}
        tint="peach"
        body={errorMessage(challenge.error, 'Could not load this challenge.')}
        action={
          <Button variant="secondary" onClick={() => challenge.refetch()}>
            Try again
          </Button>
        }
        className="glass min-h-80 rounded-panel"
      />
    );
  }
  if (!challenge.data) {
    return (
      <div aria-busy="true" className="flex flex-col gap-4">
        <span className="sr-only" role="status">
          Loading
        </span>
        <Skeleton className="h-52 rounded-[28px]" />
        <Skeleton className="h-40 rounded-[24px]" />
      </div>
    );
  }

  const { entries, ...summary } = challenge.data;
  return (
    <div className="flex flex-col gap-5">
      <Header summary={summary} now={now} communities={communities.data} />
      {summary.status === 'closed' ? <Shortlist summary={summary} /> : null}
      {summary.aiSummary ? <AiRecap text={summary.aiSummary} /> : null}
      <Entries
        entries={entries}
        open={summary.status === 'open'}
        shortlisted={new Set(summary.shortlist?.map((item) => item.postId))}
        winnerPostId={summary.winnerPostId}
      />
    </div>
  );
}

function Header({
  summary,
  now,
  communities,
}: {
  summary: ChallengeSummary;
  now: number;
  communities: ReturnType<typeof useStudioCommunities>['data'];
}) {
  const close = useCloseChallenge(summary.id);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const open = summary.status === 'open';

  return (
    <GlassPanel
      as="section"
      strength="strong"
      aria-labelledby="challenge-title"
      className="rounded-[28px] p-5 sm:p-7"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {backLink}
          <ChallengeCommunity challenge={summary} communities={communities} />
          <CountdownPill challenge={summary} now={now} />
        </div>
        {open ? (
          <Button icon={<Flag />} loading={close.isPending} onClick={() => setConfirmOpen(true)}>
            Close and shortlist
          </Button>
        ) : null}
      </div>
      <h2
        id="challenge-title"
        className="mt-5 font-display text-[28px] leading-[1.1] text-ink sm:text-[36px]"
      >
        {summary.title}
      </h2>
      {summary.body ? (
        <p className="mt-3 max-w-[68ch] text-body whitespace-pre-line text-ink">{summary.body}</p>
      ) : null}
      <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-small text-ink-soft">
        <span className="inline-flex items-center gap-1.5">
          <CalendarClock aria-hidden="true" strokeWidth={1.5} className="size-4" />
          {new Date(summary.dueAt).getTime() > now ? 'Due' : 'Was due'}{' '}
          {dueFormat.format(new Date(summary.dueAt))}
        </span>
        <span aria-hidden="true">·</span>
        <span className="text-ink tabular-nums">
          {formatNumber(summary.entryCount)} {pluralize(summary.entryCount, 'entry', 'entries')}
        </span>
      </p>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Close this challenge?"
        body="Fans can no longer enter. The AI builds a shortlist of up to 3 entries with a reason for each, and the fans on it are told. You pick the winner."
        confirmLabel="Close and shortlist"
        icon={<Flag />}
        onConfirm={() =>
          close.mutate(undefined, {
            onSuccess: (closed) =>
              toastSuccess(
                closed.shortlist?.length
                  ? 'Closed. Your shortlist is ready.'
                  : 'Closed. There were no entries to shortlist.',
              ),
          })
        }
      />
    </GlassPanel>
  );
}

function Shortlist({ summary }: { summary: ChallengeSummary }) {
  const pick = usePickWinner(summary.id);
  const list = summary.shortlist ?? [];
  const winner = list.find((item) => item.postId === summary.winnerPostId);

  return (
    <section aria-labelledby="shortlist-heading" className="flex flex-col gap-3">
      <h2 id="shortlist-heading" className="px-2 text-h2 text-ink">
        Shortlist
      </h2>
      {summary.winnerPostId ? (
        <GlassPanel
          strength="strong"
          className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-[24px] p-5"
        >
          <Trophy aria-hidden="true" strokeWidth={1.5} className="size-6 shrink-0 text-ink" />
          <p className="min-w-[12rem] flex-1 text-body text-ink">
            {winner ? <span className="text-label-strong">{winner.title}</span> : 'Your winner'}{' '}
            won. Give it your spotlight so everyone sees it.
          </p>
          <Link
            href={routes.dashboard.promoteComposer(summary.winnerPostId)}
            className={buttonVariants({ variant: 'primary', size: 'md' })}
          >
            <Sparkles aria-hidden className="size-4" />
            Give it your spotlight
          </Link>
        </GlassPanel>
      ) : null}
      {list.length === 0 ? (
        <EmptyState
          icon={Trophy}
          body="No shortlist this time. There were no entries to rank."
          className="glass min-h-40 rounded-panel"
        />
      ) : (
        <ol className="grid gap-3">
          {list.map((item, index) => (
            <ShortlistRow
              key={item.postId}
              item={item}
              rank={index + 1}
              isWinner={item.postId === summary.winnerPostId}
              canPick={!summary.winnerPostId}
              picking={pick.isPending && pick.variables === item.postId}
              onPick={() =>
                pick.mutate(item.postId, {
                  onSuccess: () => toastSuccess('Winner picked.'),
                })
              }
            />
          ))}
        </ol>
      )}
    </section>
  );
}

/** The AI's short recap of all entries, written after close (none until then). */
function AiRecap({ text }: { text: string }) {
  return (
    <GlassPanel
      as="section"
      strength="strong"
      aria-labelledby="ai-recap-heading"
      className="flex flex-col gap-2 rounded-[24px] p-5"
    >
      <h2 id="ai-recap-heading" className="text-label-strong text-ink">
        AI recap of the entries
      </h2>
      <p className="text-body whitespace-pre-line text-ink-soft">{text}</p>
    </GlassPanel>
  );
}

function ShortlistRow({
  item,
  rank,
  isWinner,
  canPick,
  picking,
  onPick,
}: {
  item: ChallengeShortlistItem;
  rank: number;
  isWinner: boolean;
  canPick: boolean;
  picking: boolean;
  onPick: () => void;
}) {
  return (
    <li>
      <GlassPanel
        as="article"
        className={cn(
          'flex flex-wrap items-center gap-x-4 gap-y-3 rounded-[24px] p-5',
          isWinner && 'ring-2 ring-ink/70',
        )}
      >
        <span
          aria-hidden="true"
          className="grid size-10 shrink-0 place-items-center rounded-full bg-aurora-peach font-display text-[22px] text-ink"
        >
          {rank}
        </span>
        <div className="min-w-[12rem] flex-1">
          <h3 className="text-h2 text-ink">
            <Link
              href={routes.dashboard.ideas({ item: item.postId })}
              className="rounded-sm underline-offset-4 hover:underline"
            >
              {item.title}
            </Link>
          </h3>
          <p className="text-small text-ink-soft">by {item.authorName}</p>
          <p className="mt-2 text-small text-ink-soft">
            <span className="font-medium text-ink">Why:</span> {item.reason}
          </p>
        </div>
        {isWinner ? (
          <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-aurora-mint px-3 text-caption text-ink">
            <Trophy aria-hidden="true" strokeWidth={1.5} className="size-4" />
            Winner
          </span>
        ) : canPick ? (
          <Button
            variant="secondary"
            size="md"
            icon={<Trophy />}
            loading={picking}
            onClick={onPick}
            aria-label={`Pick ${item.title} as the winner`}
          >
            Pick winner
          </Button>
        ) : null}
      </GlassPanel>
    </li>
  );
}

function Entries({
  entries,
  open,
  shortlisted,
  winnerPostId,
}: {
  entries: IdeaItem[];
  open: boolean;
  shortlisted: Set<string>;
  winnerPostId: string | null;
}) {
  return (
    <section aria-labelledby="entries-heading" className="flex flex-col gap-3">
      <h2 id="entries-heading" className="px-2 text-h2 text-ink">
        Entries <span className="text-ink-soft tabular-nums">({formatNumber(entries.length)})</span>
      </h2>
      {open && entries.length > 0 ? (
        <p className="px-2 text-small text-ink-soft">
          The shortlist appears when you close the challenge.
        </p>
      ) : null}
      {entries.length === 0 ? (
        <EmptyState
          icon={Trophy}
          body={
            open
              ? 'No entries yet. Fans can enter from their community page.'
              : 'No one entered this challenge.'
          }
          className="glass min-h-48 rounded-panel"
        />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {entries.map((entry) => (
            <li key={entry.id}>
              <EntryCard
                entry={entry}
                shortlisted={shortlisted.has(entry.id)}
                winner={entry.id === winnerPostId}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function EntryCard({
  entry,
  shortlisted,
  winner,
}: {
  entry: IdeaItem;
  shortlisted: boolean;
  winner: boolean;
}) {
  return (
    <GlassPanel
      as="article"
      className="group relative flex h-full min-w-0 flex-col gap-3 rounded-[24px] p-5 transition-colors duration-150 ease-out-quart hover:bg-white/80"
    >
      <div className="flex items-center gap-3">
        <AvatarInitials name={entry.author.name} image={entry.author.image} size={40} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-label text-ink">{entry.author.name}</p>
          <CommunityChip
            name={entry.community.name}
            tint={entry.community.tint}
            icon={entry.community.icon}
            className="mt-0.5"
          />
        </div>
        {winner ? (
          <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-aurora-mint px-3 text-caption text-ink">
            <Trophy aria-hidden="true" strokeWidth={1.5} className="size-4" />
            Winner
          </span>
        ) : shortlisted ? (
          <span className="inline-flex h-7 items-center rounded-full bg-aurora-peach px-3 text-caption text-ink">
            Shortlisted
          </span>
        ) : (
          <MatchLabel score={entry.ai.fitScore} />
        )}
      </div>
      <h3 className="line-clamp-2 text-h2 text-ink">
        <Link
          href={routes.dashboard.ideas({ item: entry.id })}
          className="rounded-sm underline-offset-4 group-hover:underline after:absolute after:inset-0 after:rounded-[24px]"
        >
          {entry.title}
        </Link>
      </h3>
      <p className="line-clamp-2 text-body text-ink-soft">{entry.excerpt}</p>
      {entry.ai.fitReason ? (
        <p className="line-clamp-2 text-small text-ink-soft">
          <span className="font-medium text-ink">Why:</span> {entry.ai.fitReason}
        </p>
      ) : null}
      <p className="mt-auto pt-1 text-small text-ink-soft tabular-nums">
        {formatNumber(entry.useCount)} would use this · {formatNumber(entry.buildCount)} count me in
      </p>
    </GlassPanel>
  );
}
