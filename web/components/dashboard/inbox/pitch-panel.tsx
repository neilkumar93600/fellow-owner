'use client';

import {
  type FeedbackVerdict,
  type InboxDetail,
  type InboxItem,
  PITCH_TYPE_LABELS,
  type PitchStatus,
} from '@fellow-owners/shared';
import { Archive, ArchiveRestore, Eye, Star, ThumbsDown, ThumbsUp } from 'lucide-react';
import type * as React from 'react';
import { AiChip } from '@/components/shared/ai-chip';
import { AvatarInitials } from '@/components/shared/avatar-initials';
import { FitPill } from '@/components/shared/fit-pill';
import { SidePanel, type SidePanelProps } from '@/components/shared/side-panel';
import { StatusPill } from '@/components/shared/status-pill';
import { cardTint, TINT_STYLES } from '@/components/shared/tint';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/ui/cn';
import { formatDate, formatNumber, formatRelative, pluralize } from '@/lib/format';
import { ReplyBox } from './reply-box';

const CHIP = 'inline-flex h-6 items-center rounded-full px-2.5 text-caption text-ink';
// A pressed toggle fills its icon; aria-pressed carries the state.
const PRESSED_FILL = 'aria-pressed:[&_svg]:fill-current';

export interface PitchPanelProps {
  /** The message on show; kept while the panel closes so the title does not blank mid-exit. */
  item: InboxItem;
  open: boolean;
  /** The full message and sender profile, when loaded for this item. */
  detail: InboxDetail | null;
  vote: FeedbackVerdict | null;
  /** The creator's setting: fans' trackers show Read. */
  showReadReceipts: boolean;
  now: number;
  onOpenChange: (open: boolean) => void;
  /** The row's sender link, where focus lands on close. */
  finalFocus: SidePanelProps['finalFocus'];
  onStatus: (item: InboxItem, status: PitchStatus) => void;
  onRestore: (item: InboxItem) => void;
  onRetry: (item: InboxItem) => void;
  onVote: (item: InboxItem, verdict: FeedbackVerdict) => void;
  onReply: (item: InboxItem, reply: string) => void;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6 border-t border-line-row pt-5">
      <h3 className="text-label-strong text-ink">{title}</h3>
      <div className="mt-2">{children}</div>
    </section>
  );
}

/**
 * DESIGN.md Side panel for a fan message: the subject as the H2 with its status, then the sender, why the
 * AI picked it (its match and reason, with thumbs), the full message at 68ch and its links. The sticky
 * footer holds Shortlist and Archive (Restore for a kept-out message) and the reply box, which can draft
 * in the creator's voice and holds the one coral button.
 */
export function PitchPanel({
  item,
  open,
  detail,
  vote,
  showReadReceipts,
  now,
  onOpenChange,
  finalFocus,
  onStatus,
  onRestore,
  onRetry,
  onVote,
  onReply,
}: PitchPanelProps) {
  const { sender, ai } = item;
  const profile = detail?.senderProfile;
  const links = detail?.links ?? [];
  const sentReply = detail?.creatorReply;
  const shortlisted = item.status === 'shortlisted';
  const archived = item.status === 'archived';

  const actions = item.isFiltered ? (
    <Button variant="secondary" icon={<ArchiveRestore />} onClick={() => onRestore(item)}>
      Restore
    </Button>
  ) : (
    <>
      <Button
        variant="secondary"
        icon={<Star />}
        aria-pressed={shortlisted}
        className={PRESSED_FILL}
        onClick={() => onStatus(item, shortlisted ? 'new' : 'shortlisted')}
      >
        Shortlist
      </Button>
      <Button
        variant="secondary"
        icon={<Archive />}
        onClick={() => onStatus(item, archived ? 'new' : 'archived')}
      >
        {archived ? 'Unarchive' : 'Archive'}
      </Button>
    </>
  );

  return (
    <SidePanel
      open={open}
      onOpenChange={onOpenChange}
      title={item.subject}
      status={<StatusPill status={item.isFiltered ? 'filtered' : item.status} />}
      finalFocus={finalFocus}
      footer={
        <ReplyBox
          key={item.id}
          pitchId={item.id}
          name={sender.name}
          onSend={(text) => onReply(item, text)}
          actions={actions}
        />
      }
    >
      <div className="flex items-center gap-3">
        <AvatarInitials name={sender.name} image={sender.image} size={40} />
        <div className="min-w-0">
          <p className="text-label-strong text-ink">{sender.name}</p>
          {sender.headline ? <p className="text-small text-ink-muted">{sender.headline}</p> : null}
        </div>
      </div>
      <p className="mt-3 text-small text-ink-muted">
        {PITCH_TYPE_LABELS[item.type]} · {formatRelative(item.createdAt, now)}
      </p>
      {item.isFiltered ? null : (
        <p className="mt-1 flex items-center gap-1.5 text-small text-ink-muted">
          <Eye aria-hidden="true" strokeWidth={1.5} className="size-4 shrink-0" />
          {showReadReceipts
            ? 'Fans see when you’ve read and shortlisted this.'
            : 'Fans see when you’ve shortlisted this.'}
        </p>
      )}

      {profile ? (
        <dl className="mt-4 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2 text-small">
          <dt className="text-ink-muted">Fan since</dt>
          <dd className="text-ink">{formatDate(profile.joinedAt, now)}</dd>
          {profile.communities.length > 0 ? (
            <>
              <dt className="text-ink-muted">Communities</dt>
              <dd className="flex flex-wrap gap-1.5">
                {profile.communities.map((community) => (
                  <span
                    key={community.slug}
                    className={cn(CHIP, TINT_STYLES[cardTint(community.tint)].chip)}
                  >
                    {community.name}
                  </span>
                ))}
              </dd>
            </>
          ) : null}
          {profile.skills.length > 0 ? (
            <>
              <dt className="text-ink-muted">Skills</dt>
              <dd className="text-ink">{profile.skills.join(', ')}</dd>
            </>
          ) : null}
          <dt className="text-ink-muted">Activity</dt>
          <dd className="text-ink">
            {formatNumber(profile.pitchCount)} {pluralize(profile.pitchCount, 'message')},{' '}
            {formatNumber(profile.postCount)} {pluralize(profile.postCount, 'post')}
          </dd>
        </dl>
      ) : null}

      <Section title="Why this one">
        {ai.status === 'pending' ? (
          <div className="flex flex-wrap items-center gap-3">
            <AiChip kind="reviewing" />
            <p className="text-small text-ink-muted">
              You can act on this message while it is read.
            </p>
          </div>
        ) : ai.status === 'failed' ? (
          <div className="flex flex-wrap items-center gap-3">
            <AiChip kind="not-analyzed" onRetry={() => onRetry(item)} />
            <p className="text-small text-ink-muted">The AI could not read this message.</p>
          </div>
        ) : (
          <>
            {ai.summary ? <p className="text-body text-ink">{ai.summary}</p> : null}
            {ai.fitScore != null && ai.fitReason ? (
              <div className="mt-3 flex items-start gap-3">
                <FitPill score={ai.fitScore} reason={ai.fitReason} />
                <p className="text-small text-ink-muted">{ai.fitReason}</p>
              </div>
            ) : null}
            {ai.tags.length > 0 ? (
              <ul aria-label="Tags" className="mt-3 flex flex-wrap gap-1.5">
                {ai.tags.map((tag) => (
                  <li key={tag} className={cn(CHIP, 'bg-table-head')}>
                    {tag}
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="mt-3 flex items-center gap-2">
              <p id={`triage-vote-${item.id}`} className="text-small text-ink-muted">
                Did the AI read this right?
              </p>
              <fieldset aria-labelledby={`triage-vote-${item.id}`} className="flex min-w-0">
                <Button
                  variant="ghost"
                  surface="white"
                  aria-label="Yes"
                  aria-pressed={vote === 'up'}
                  className={cn('text-ink-soft aria-pressed:text-ink', PRESSED_FILL)}
                  onClick={() => onVote(item, 'up')}
                >
                  <ThumbsUp />
                </Button>
                <Button
                  variant="ghost"
                  surface="white"
                  aria-label="No"
                  aria-pressed={vote === 'down'}
                  className={cn('text-ink-soft aria-pressed:text-ink', PRESSED_FILL)}
                  onClick={() => onVote(item, 'down')}
                >
                  <ThumbsDown />
                </Button>
              </fieldset>
            </div>
          </>
        )}
      </Section>

      <Section title="Their message">
        <p className="max-w-[68ch] text-body whitespace-pre-line text-ink">
          {detail?.body ?? item.excerpt}
        </p>
        {links.length > 0 ? (
          <ul className="mt-3 flex flex-col gap-1.5">
            {links.map((link) => (
              <li key={link.url}>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-sm text-body text-ink underline underline-offset-3"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        ) : null}
      </Section>

      {sentReply ? (
        <Section title="Your reply">
          <p className="max-w-[68ch] text-body whitespace-pre-line text-ink">{sentReply}</p>
        </Section>
      ) : null}
    </SidePanel>
  );
}
