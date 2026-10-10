'use client';

import { LIMITS, type QuestionGroup } from '@fellow-owners/shared';
import { ChevronDown, RefreshCw, Send, Sparkles, X } from 'lucide-react';
import Link from 'next/link';
import { useId, useState } from 'react';
import { AiChip } from '@/components/shared/ai-chip';
import { AvatarInitials } from '@/components/shared/avatar-initials';
import { CommunityChip } from '@/components/shared/community-chip';
import { SidePanel, type SidePanelProps } from '@/components/shared/side-panel';
import { StatusPill } from '@/components/shared/status-pill';
import { Button } from '@/components/ui/button';
import { buttonVariants } from '@/components/ui/button-variants';
import { cn } from '@/components/ui/cn';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, TextArea } from '@/components/ui/field';
import { useRedraftQuestionGroup } from '@/hooks/queries/use-question-groups';
import { formatDate, formatNumber, pluralize } from '@/lib/format';
import { routes, withQuery } from '@/lib/routes';

export interface AnswerSend {
  answer: string;
  replyAll: boolean;
  pinIds: string[];
}

export interface QuestionGroupPanelProps {
  group: QuestionGroup;
  open: boolean;
  handle: string;
  now: number;
  onOpenChange: (open: boolean) => void;
  finalFocus: SidePanelProps['finalFocus'];
  onRemoveAsker: (group: QuestionGroup, pitchId: string) => void;
  onSend: (group: QuestionGroup, send: AnswerSend) => void;
  onDismiss: (group: QuestionGroup) => void;
}

const DISCLOSURE =
  'press -mx-2 inline-flex h-10 items-center gap-1.5 rounded-full px-2 text-small-strong text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink';
const PILL =
  'press inline-flex h-10 items-center rounded-full border px-4 text-small-strong transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink';

/**
 * One thing fans keep asking for: who asked and in their words, "Make it" (the Spotlight composer on this
 * topic), an AI draft in the creator's voice, and a sticky footer that sends one answer to every fan who
 * asked and pins it where they gather. A wrong match comes out with "Not this one" before anything is
 * sent. Answered groups open read-only. Key it by group id, so a draft never carries over to another.
 */
export function QuestionGroupPanel(props: QuestionGroupPanelProps) {
  const { group, open, onOpenChange, finalFocus, handle } = props;
  const [answer, setAnswer] = useState(group.draft ?? '');
  const answered = group.status === 'answered';
  return (
    <SidePanel
      open={open}
      onOpenChange={onOpenChange}
      title={group.question}
      status={
        <StatusPill status={answered ? 'replied' : 'new'} label={answered ? 'Answered' : 'Open'} />
      }
      finalFocus={finalFocus}
      footer={answered ? null : <SendFooter {...props} answer={answer} />}
    >
      <Askers {...props} />
      {answered ? (
        <Answered group={group} handle={handle} />
      ) : (
        <AnswerEditor group={group} answer={answer} onAnswer={setAnswer} />
      )}
    </SidePanel>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6 border-t border-line-row pt-5">
      <h3 className="text-label-strong text-ink">{title}</h3>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function Askers({ group, now, onRemoveAsker }: QuestionGroupPanelProps) {
  const [showAll, setShowAll] = useState(false);
  const listId = useId();
  const editable = group.status === 'open';
  return (
    <>
      {editable ? (
        <Link
          href={withQuery(routes.dashboard.promote(), { title: group.question })}
          className={cn(buttonVariants({ variant: 'secondary', size: 'md' }), 'mb-4 w-fit')}
        >
          <Sparkles aria-hidden="true" className="size-4" />
          Make it
        </Link>
      ) : null}
      <p className="text-small text-ink-muted">
        <span className="text-small-strong text-ink tabular-nums">
          {formatNumber(group.askedCount)}
        </span>{' '}
        {pluralize(group.askedCount, 'fan', 'fans')} asked · since{' '}
        <time dateTime={group.firstAskedAt} suppressHydrationWarning>
          {formatDate(group.firstAskedAt, now)}
        </time>
      </p>
      <ul aria-label="Communities they’re in" className="mt-3 flex flex-wrap gap-1.5">
        {group.communities.map((community) => (
          <li key={community.id}>
            <CommunityChip name={community.name} tint={community.tint} icon={community.icon} />
          </li>
        ))}
      </ul>

      <Section title="In their words">
        <ul className="flex flex-col gap-4">
          {group.askers.slice(0, 3).map((asker) => (
            <li key={asker.pitchId}>
              <figure>
                <blockquote className="max-w-[68ch] text-body text-ink">“{asker.quote}”</blockquote>
                <figcaption className="mt-1 text-small text-ink-muted">
                  {asker.member.name} · {asker.community.name}
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
        <button
          type="button"
          aria-expanded={showAll}
          aria-controls={listId}
          onClick={() => setShowAll((value) => !value)}
          className={cn(DISCLOSURE, 'mt-3')}
        >
          <ChevronDown
            aria-hidden="true"
            className={cn('size-4 transition-transform duration-150', showAll && 'rotate-180')}
          />
          {group.askers.length < group.askedCount
            ? `See the ${formatNumber(group.askers.length)} latest`
            : `See all ${formatNumber(group.askedCount)}`}
        </button>
        <ul id={listId} hidden={!showAll} className="mt-1 flex flex-col">
          {group.askers.map((asker) => (
            <li
              key={asker.pitchId}
              className="flex items-center gap-3 border-b border-line-row py-2 last:border-b-0"
            >
              <AvatarInitials name={asker.member.name} image={asker.member.image} size={28} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-small-strong text-ink">{asker.member.name}</p>
                <p className="truncate text-small text-ink-muted">
                  {asker.community.name} ·{' '}
                  <time dateTime={asker.createdAt} suppressHydrationWarning>
                    {formatDate(asker.createdAt, now)}
                  </time>
                </p>
              </div>
              {editable ? (
                <Button
                  variant="ghost"
                  size="md"
                  surface="white"
                  icon={<X />}
                  className="shrink-0 text-ink-soft"
                  onClick={() => onRemoveAsker(group, asker.pitchId)}
                >
                  Not this one<span className="sr-only">: {asker.member.name}</span>
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}

function Answered({ group, handle }: { group: QuestionGroup; handle: string }) {
  return (
    <Section title="Your answer">
      <p className="max-w-[68ch] text-body whitespace-pre-line text-ink">{group.answer}</p>
      <p className="mt-3 text-small text-ink-muted">
        Sent to {formatNumber(group.askedCount)} {pluralize(group.askedCount, 'fan', 'fans')}
        {group.answeredAt ? (
          <>
            {' '}
            on{' '}
            <time dateTime={group.answeredAt} suppressHydrationWarning>
              {formatDate(group.answeredAt)}
            </time>
          </>
        ) : null}
        {group.pinnedIn.length ? `. Pinned in ${group.pinnedIn.join(' and ')}.` : '.'}
      </p>
      {group.postId ? (
        <Link
          href={routes.fan.post(handle, group.postId)}
          className="mt-2 inline-flex h-10 items-center rounded-sm text-small-strong text-ink underline decoration-line-row underline-offset-4 hover:decoration-ink"
        >
          See the post
        </Link>
      ) : null}
    </Section>
  );
}

function AnswerEditor({
  group,
  answer,
  onAnswer,
}: {
  group: QuestionGroup;
  answer: string;
  onAnswer: (answer: string) => void;
}) {
  const redraftMutation = useRedraftQuestionGroup();
  const redraftsLeft = group.redraftsLeft;

  function redraft() {
    redraftMutation.mutate(group, { onSuccess: (result) => onAnswer(result.draft) });
  }

  return (
    <Section title="Your answer">
      <Field
        label={
          <span className="flex flex-wrap items-center gap-2">
            Answer
            {group.draft ? <AiChip kind="suggested" label="AI draft" /> : null}
          </span>
        }
        helper={
          group.draft
            ? 'Drafted in your voice from what you love. Edit anything before it goes out.'
            : 'AI pending. Write your answer, or try a draft in a moment.'
        }
        count={{ value: answer.length, max: LIMITS.pitch.reply.max }}
      >
        <TextArea
          rows={6}
          value={answer}
          maxLength={LIMITS.pitch.reply.max}
          onChange={(event) => onAnswer(event.target.value)}
        />
      </Field>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button
          variant="secondary"
          size="md"
          icon={<RefreshCw />}
          loading={redraftMutation.isPending}
          disabled={redraftsLeft <= 0}
          onClick={redraft}
        >
          Redraft
        </Button>
        <p className="text-small text-ink-muted">
          {redraftsLeft > 0
            ? `${formatNumber(redraftsLeft)} ${pluralize(redraftsLeft, 'redraft')} left today`
            : 'Redrafts reset tomorrow'}
        </p>
      </div>
    </Section>
  );
}

function SendFooter({
  group,
  answer,
  onSend,
  onDismiss,
}: QuestionGroupPanelProps & { answer: string }) {
  const [replyAll, setReplyAll] = useState(true);
  const [pinIds, setPinIds] = useState(group.communities.map((community) => community.id));
  const [confirming, setConfirming] = useState(false);
  const [dismissing, setDismissing] = useState(false);
  const replyAllId = useId();

  const count = group.askedCount;
  const people = `${formatNumber(count)} ${pluralize(count, 'fan', 'fans')}`;
  const length = answer.trim().length;
  // A pinned answer becomes a post, so it needs a post's minimum length.
  const ready =
    length > 0 &&
    (replyAll || pinIds.length > 0) &&
    (pinIds.length === 0 || length >= LIMITS.post.body.min);
  const label = replyAll ? `Send to ${people}` : 'Pin answer';
  const pinnedNames = group.communities
    .filter((community) => pinIds.includes(community.id))
    .map((community) => community.name)
    .join(' and ');

  const togglePin = (id: string) =>
    setPinIds((ids) => (ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id]));

  return (
    <div className="flex flex-col gap-3">
      <fieldset className="flex flex-col gap-2">
        <legend className="sr-only">Where the answer goes</legend>
        <label htmlFor={replyAllId} className="flex min-h-10 items-center gap-3 text-body text-ink">
          <input
            id={replyAllId}
            type="checkbox"
            checked={replyAll}
            onChange={(event) => setReplyAll(event.target.checked)}
            className="size-5 shrink-0 accent-ink"
          />
          Reply to all {people}
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-small text-ink-muted">Pin in</span>
          {group.communities.map((community) => {
            const on = pinIds.includes(community.id);
            return (
              <button
                key={community.id}
                type="button"
                aria-pressed={on}
                onClick={() => togglePin(community.id)}
                className={cn(
                  PILL,
                  on
                    ? 'border-ink bg-ink text-white'
                    : 'border-line bg-white text-ink hover:bg-page',
                )}
              >
                {community.name}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="destructive" icon={<X />} onClick={() => setDismissing(true)}>
          Dismiss
        </Button>
        <Button
          icon={<Send />}
          disabled={!ready}
          className="flex-1"
          onClick={() => setConfirming(true)}
        >
          {label}
        </Button>
      </div>

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent>
          <DialogTitle>
            {replyAll ? `Send this answer to ${people}?` : 'Pin this answer?'}
          </DialogTitle>
          <DialogDescription>
            {replyAll
              ? 'Each fan gets it as your reply, and their trackers show Replied.'
              : 'It goes up as a pinned post. Their messages stay in your fan mail as they are.'}
            {pinnedNames ? ` Pinned in ${pinnedNames}.` : ''}
          </DialogDescription>
          <DialogFooter>
            <DialogClose render={<Button variant="secondary" />}>Cancel</DialogClose>
            <Button
              icon={<Send />}
              onClick={() => {
                setConfirming(false);
                onSend(group, { answer: answer.trim(), replyAll, pinIds });
              }}
            >
              {label}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dismissing} onOpenChange={setDismissing}>
        <DialogContent>
          <DialogTitle>Dismiss this group?</DialogTitle>
          <DialogDescription>
            The {people} who asked stay in your fan mail as normal messages. Nobody is told.
          </DialogDescription>
          <DialogFooter>
            <DialogClose render={<Button variant="secondary" />}>Cancel</DialogClose>
            <Button
              variant="destructive-secondary"
              icon={<X />}
              onClick={() => {
                setDismissing(false);
                onDismiss(group);
              }}
            >
              Dismiss group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
