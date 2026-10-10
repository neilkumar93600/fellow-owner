import type { ChallengeSummary, StudioCommunity } from '@fellow-owners/shared';
import { Trophy } from 'lucide-react';
import Link from 'next/link';
import { GlassPanel } from '@/components/shared/glass-panel';
import { formatNumber, pluralize } from '@/lib/format';
import { routes } from '@/lib/routes';
import { ChallengeCommunity, CountdownPill } from './challenge-bits';

/** The line under a card: how many entered, and what happens next. */
function outcome(challenge: ChallengeSummary): string {
  if (challenge.status === 'open') return 'Close it when you are ready for the shortlist';
  if (challenge.winnerPostId) return 'Winner picked';
  return challenge.shortlist?.length
    ? 'Shortlist ready, pick a winner'
    : 'Closed with no shortlist';
}

/**
 * DESIGN.md Challenge card: soft frosted glass, radius 24. The community chip and the countdown on one
 * line, the title (the card's link, stretched over the whole card), the prompt in two lines, then the
 * entry count and what to do next. Hover steps the glass to 80% white.
 */
export function ChallengeCard({
  challenge,
  communities,
  now,
}: {
  challenge: ChallengeSummary;
  communities: StudioCommunity[] | undefined;
  now: number;
}) {
  return (
    <GlassPanel
      as="article"
      className="group relative flex min-w-0 flex-col gap-3 rounded-[24px] p-5 transition-colors duration-150 ease-out-quart hover:bg-white/80"
    >
      <div className="flex min-h-6 items-center justify-between gap-3">
        <ChallengeCommunity
          challenge={challenge}
          communities={communities}
          className="max-w-[60%]"
        />
        <CountdownPill challenge={challenge} now={now} />
      </div>
      <h3 className="line-clamp-2 text-h2 text-ink">
        <Link
          href={routes.dashboard.challenge(challenge.id)}
          className="rounded-sm underline-offset-4 group-hover:underline after:absolute after:inset-0 after:rounded-[24px]"
        >
          {challenge.title}
        </Link>
      </h3>
      {challenge.body ? (
        <p className="line-clamp-2 text-body text-ink-soft">{challenge.body}</p>
      ) : null}
      <p className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 pt-2 text-small text-ink-soft">
        <span className="tabular-nums text-ink">
          {formatNumber(challenge.entryCount)} {pluralize(challenge.entryCount, 'entry', 'entries')}
        </span>
        <span aria-hidden="true" className="max-sm:hidden">
          ·
        </span>
        <span className="inline-flex items-center gap-1.5">
          {challenge.winnerPostId ? (
            <Trophy aria-hidden="true" strokeWidth={1.5} className="size-4 text-ink" />
          ) : null}
          {outcome(challenge)}
        </span>
      </p>
    </GlassPanel>
  );
}
