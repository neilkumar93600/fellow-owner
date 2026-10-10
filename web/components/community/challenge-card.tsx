'use client';

import type { ChallengeSummary } from '@fellow-owners/shared';
import { Clock, Trophy } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { GlassPanel } from '@/components/shared/glass-panel';
import { buttonVariants } from '@/components/ui/button-variants';
import { cn } from '@/components/ui/cn';
import { formatNumber, pluralize } from '@/lib/format';
import { routes, withQuery } from '@/lib/routes';
import { acceptsEntries, closesIn } from './challenge-time.mjs';

/** The time the card counts down from. Server and first client render agree (null), then it ticks each minute. */
function useNow(): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

/** Match labels are creator-side only (spec 9), so a fan sees the reason without its "Strong match:" lead. */
function fanReason(reason: string): string {
  return reason
    .replace(/^(strong match|worth a look)\s*[:.\-–]\s*/i, '')
    .replace(/^./, (c) => c.toUpperCase());
}

export interface ChallengeCardProps {
  handle: string;
  challenge: ChallengeSummary;
  /** The page's coral action: Enter is coral only when the header's New post steps aside. */
  primary?: boolean;
}

/**
 * A challenge pinned above a community feed: a peach trophy tile, the title and prompt, the countdown and
 * how many entries so far, and "Enter the challenge", which opens the entry form. Once the creator closes
 * it the card shows the shortlist with the reasons and the winner, and no entry button.
 */
export function ChallengeCard({ handle, challenge, primary = false }: ChallengeCardProps) {
  const now = useNow();
  const open = acceptsEntries(challenge, now ?? Date.now());
  const shortlist = challenge.shortlist ?? [];
  const titleId = `challenge-${challenge.id}`;

  return (
    <GlassPanel as="section" strength="strong" aria-labelledby={titleId} className="p-5 sm:p-6">
      <div className="flex items-start gap-4">
        <span
          aria-hidden="true"
          className="grid size-12 shrink-0 place-items-center rounded-2xl bg-aurora-peach"
        >
          <Trophy strokeWidth={1.5} className="size-6 text-coral" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="text-caption text-ink-soft">
            {open ? 'Open challenge' : 'Challenge closed'}
            {challenge.communityName ? ` · ${challenge.communityName}` : ' · All rooms'}
          </p>
          <h2 id={titleId} className="text-h2 text-ink">
            {challenge.title}
          </h2>
          {challenge.body ? (
            <p className="line-clamp-3 max-w-[60ch] text-body text-ink">{challenge.body}</p>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-3">
        <p className="flex items-center gap-1.5 text-small text-ink">
          <Clock aria-hidden="true" strokeWidth={1.5} className="size-4" />
          <span suppressHydrationWarning>
            {open ? closesIn(challenge.dueAt, now ?? Date.now()) : 'Closed'}
          </span>
        </p>
        <p className="text-small text-ink-soft">
          <span className="tabular-nums">{formatNumber(challenge.entryCount)}</span>{' '}
          {pluralize(challenge.entryCount, 'entry', 'entries')} so far
        </p>
        {open ? (
          <Link
            href={withQuery(routes.fan.newPost(handle), { challenge: challenge.id })}
            className={cn(
              buttonVariants({ variant: primary ? 'primary' : 'secondary' }),
              'w-full sm:ml-auto sm:w-auto',
            )}
          >
            Enter the challenge
          </Link>
        ) : null}
      </div>

      {!open && shortlist.length > 0 ? (
        <div className="mt-5 border-t border-ink/10 pt-4">
          <h3 className="text-label-strong text-ink">The shortlist</h3>
          <ul className="mt-2 flex flex-col gap-3">
            {shortlist.map((item) => (
              <li key={item.postId} className="flex flex-col gap-0.5">
                <Link
                  href={routes.fan.post(handle, item.postId)}
                  className="inline-flex min-h-11 items-center text-label text-ink underline decoration-ink/30 underline-offset-4 hover:decoration-ink"
                >
                  {item.title}
                  {challenge.winnerPostId === item.postId ? (
                    <span className="ml-2 rounded-full bg-aurora-mint px-2.5 py-0.5 text-caption no-underline">
                      Winner
                    </span>
                  ) : null}
                </Link>
                <p className="text-small text-ink-soft">
                  {item.authorName} · {fanReason(item.reason)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </GlassPanel>
  );
}
