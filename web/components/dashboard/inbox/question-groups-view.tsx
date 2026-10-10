'use client';

import type { QuestionGroup } from '@fellow-owners/shared';
import { ArrowLeft, Lightbulb, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { CommunityChip } from '@/components/shared/community-chip';
import { EmptyState } from '@/components/shared/empty-state';
import { buttonVariants } from '@/components/ui/button-variants';
import { cn } from '@/components/ui/cn';
import { formatDate, formatNumber, pluralize } from '@/lib/format';
import { routes, withQuery } from '@/lib/routes';
import { toastSuccess } from '@/lib/toast';
import { type AnswerSend, QuestionGroupPanel } from './question-group-panel';

const people = (n: number) => `${formatNumber(n)} ${pluralize(n, 'fan', 'fans')}`;

/** "Make it": the Spotlight composer with the request as its draft topic (?title=). */
export const makeItHref = (group: QuestionGroup) =>
  withQuery(routes.dashboard.promote(), { title: group.question });

/**
 * "What fans want": the things fans keep asking for, as cards with how many fans want each. "Make it"
 * opens the Spotlight composer on that topic; a card also opens its side panel (?item=) to see who asked
 * and answer them all at once. Answered ones sit below.
 * ponytail: still fixture-backed for the demo space and every action is local, confirmed with a toast; an
 * API arrives with Answer Once.
 */
export function QuestionGroupsView({
  groups: loaded,
  handle,
  now,
}: {
  groups: QuestionGroup[];
  handle: string;
  now: number;
}) {
  const params = useSearchParams();
  const itemId = params.get('item');
  const [groups, setGroups] = useState(loaded);

  const go = (item: string | undefined, push = false) =>
    window.history[push ? 'pushState' : 'replaceState'](
      null,
      '',
      routes.dashboard.questions({ item }),
    );

  const openGroups = groups.filter((group) => group.status === 'open');
  const answered = groups.filter((group) => group.status === 'answered');

  // The panel keeps showing the last group while it closes, so its title does not blank mid-exit.
  const selected = itemId ? (groups.find((group) => group.id === itemId) ?? null) : null;
  const [shown, setShown] = useState(selected);
  if (selected && selected !== shown) setShown(selected);

  const update = (id: string, change: (group: QuestionGroup) => QuestionGroup) =>
    setGroups((list) => list.map((group) => (group.id === id ? change(group) : group)));

  const removeAsker = (group: QuestionGroup, pitchId: string) => {
    const asker = group.askers.find((item) => item.pitchId === pitchId);
    update(group.id, (current) => ({
      ...current,
      askers: current.askers.filter((item) => item.pitchId !== pitchId),
      askedCount: current.askedCount - 1,
    }));
    toastSuccess(
      `${asker?.member.name ?? 'That fan'}'s message is back in fan mail as a normal one.`,
    );
  };

  const send = (group: QuestionGroup, { answer, replyAll, pinIds }: AnswerSend) => {
    const pinnedIn = group.communities
      .filter((community) => pinIds.includes(community.id))
      .map((community) => community.name);
    update(group.id, (current) => ({
      ...current,
      status: 'answered',
      answer,
      answeredAt: new Date().toISOString(),
      pinnedIn,
    }));
    const pinned = pinnedIn.length ? ` Pinned in ${pinnedIn.join(' and ')}.` : '';
    toastSuccess(
      replyAll ? `Sent to ${people(group.askedCount)}.${pinned}` : `Answer pinned.${pinned}`,
    );
  };

  const dismiss = (group: QuestionGroup) => {
    update(group.id, (current) => ({ ...current, status: 'dismissed' }));
    go(undefined);
    toastSuccess('Dismissed. Those messages stay in your fan mail.');
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="sr-only">What fans want</h1>
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <p className="max-w-[68ch] text-body text-ink">
          Things fans keep asking for. Make one into your next video, or answer everyone who asked
          in one go.
        </p>
        <Link
          href={routes.dashboard.inbox()}
          className={buttonVariants({ variant: 'secondary', surface: 'glass', size: 'md' })}
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Back to fan mail
        </Link>
      </div>

      <section aria-labelledby="open-groups" className="flex flex-col gap-4">
        <h2 id="open-groups" className="text-h2 text-ink">
          Asked for{' '}
          <span className="text-ink tabular-nums">· {formatNumber(openGroups.length)}</span>
        </h2>
        {openGroups.length ? (
          <ul className="grid gap-5 @3xl:grid-cols-2">
            {openGroups.map((group) => (
              <li key={group.id} className="min-w-0">
                <GroupCard group={group} now={now} onOpen={() => go(group.id, !itemId)} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={Lightbulb}
            body="Nothing is piling up right now. When many fans ask for the same thing, it shows up here."
            className="glass-strong min-h-64 rounded-panel"
          />
        )}
      </section>

      {answered.length ? (
        <section aria-labelledby="answered-groups" className="flex flex-col gap-4">
          <h2 id="answered-groups" className="text-h2 text-ink">
            Answered
          </h2>
          <ul className="glass-strong flex flex-col rounded-panel p-2">
            {answered.map((group) => (
              <li key={group.id}>
                <button
                  type="button"
                  data-group={group.id}
                  onClick={() => go(group.id, !itemId)}
                  className="press flex w-full flex-col items-start gap-0.5 rounded-2xl px-4 py-3 text-left transition-colors duration-150 hover:bg-white/70"
                >
                  <span className="text-label-strong text-ink">{group.question}</span>
                  <span className="text-small text-ink-soft">
                    Sent to {people(group.askedCount)}
                    {group.answeredAt ? ` · ${formatDate(group.answeredAt, now)}` : ''}
                    {group.pinnedIn.length ? ` · Pinned in ${group.pinnedIn.join(' and ')}` : ''}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {shown ? (
        <QuestionGroupPanel
          key={shown.id}
          group={groups.find((group) => group.id === shown.id) ?? shown}
          open={selected !== null}
          handle={handle}
          now={now}
          onOpenChange={(next) => {
            if (!next) go(undefined);
          }}
          finalFocus={() =>
            document.querySelector<HTMLElement>(`[data-group="${shown.id}"]`) ?? true
          }
          onRemoveAsker={removeAsker}
          onSend={send}
          onDismiss={dismiss}
        />
      ) : null}
    </div>
  );
}

function GroupCard({
  group,
  now,
  onOpen,
}: {
  group: QuestionGroup;
  now: number;
  onOpen: () => void;
}) {
  const quote = group.askers[0]?.quote;
  return (
    <article className="glass-strong relative flex h-full flex-col gap-3 rounded-[24px] p-5 transition-colors duration-150 hover:bg-white/85">
      <p className="text-small text-ink-soft">
        <span className="text-label-strong text-ink tabular-nums">
          {formatNumber(group.askedCount)}
        </span>{' '}
        {pluralize(group.askedCount, 'fan wants', 'fans want')}
      </p>
      <h3 className="text-h2 text-ink">
        <button
          type="button"
          data-group={group.id}
          onClick={onOpen}
          className={cn(
            'rounded-sm text-left',
            'after:absolute after:inset-0 after:rounded-[24px] after:content-[""]',
          )}
        >
          {group.question}
          <span className="sr-only">: see who asked</span>
        </button>
      </h3>
      {quote ? (
        <p className="line-clamp-2 max-w-[68ch] text-body text-ink-soft">“{quote}”</p>
      ) : null}
      <p className="text-small text-ink-soft">First asked {formatDate(group.firstAskedAt, now)}</p>
      <div className="mt-auto flex flex-wrap items-center gap-3 pt-1">
        <AskerStack
          people={group.askers.slice(0, 4).map((asker) => asker.member)}
          total={group.askedCount}
        />
        <ul aria-label="Communities" className="flex min-w-0 flex-wrap gap-1.5">
          {group.communities.map((community) => (
            <li key={community.id}>
              <CommunityChip name={community.name} tint={community.tint} icon={community.icon} />
            </li>
          ))}
        </ul>
        <Link
          href={makeItHref(group)}
          className={cn(
            buttonVariants({ variant: 'secondary', size: 'md', surface: 'glass' }),
            'relative z-10 ml-auto',
          )}
        >
          <Sparkles aria-hidden="true" className="size-4" />
          Make it
          <span className="sr-only">: {group.question}</span>
        </Link>
      </div>
    </article>
  );
}

const TILES = ['bg-peach-tile', 'bg-lavender-tile', 'bg-aqua-tile'] as const;

function twoLetters(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}

/** Fixed 32px circles with 2-letter initials, overlapping by 6px so the centred letters stay clear. */
function AskerStack({ people, total }: { people: { name: string }[]; total: number }) {
  const more = Math.max(total, people.length) - people.length;
  const label = `${people.map((p) => p.name).join(', ')}${more > 0 ? ` and ${more} more` : ''}`;
  const circle =
    'grid size-8 shrink-0 place-items-center rounded-full text-[11px] leading-none font-semibold text-ink ring-2 ring-white select-none';
  return (
    <span role="img" aria-label={label} className="flex items-center -space-x-1.5">
      {people.map((p, i) => (
        <span key={p.name} aria-hidden="true" className={cn(circle, TILES[i % TILES.length])}>
          {twoLetters(p.name)}
        </span>
      ))}
      {more > 0 ? (
        <span aria-hidden="true" className={cn(circle, 'bg-table-head')}>
          +{more}
        </span>
      ) : null}
    </span>
  );
}
