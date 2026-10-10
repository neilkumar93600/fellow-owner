'use client';

import {
  type FeedbackVerdict,
  type IdeaItem,
  POST_TYPE_LABELS,
  type StudioPostDetail,
} from '@fellow-owners/shared';
import { Eye, EyeOff, Megaphone, RefreshCw, ThumbsDown, ThumbsUp } from 'lucide-react';
import Link from 'next/link';
import type * as React from 'react';
import { useId, useState } from 'react';
import { CommentForm } from '@/components/post/comment-form';
import { SimilarSection } from '@/components/post/similar-section';
import { AiChip } from '@/components/shared/ai-chip';
import { AvatarInitials } from '@/components/shared/avatar-initials';
import { CommunityChip } from '@/components/shared/community-chip';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { FitPill } from '@/components/shared/fit-pill';
import { SidePanel, type SidePanelProps } from '@/components/shared/side-panel';
import { StatusPill } from '@/components/shared/status-pill';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/ui/cn';
import {
  useModerateComment,
  usePostAction,
  usePostFeedback,
  useStudioComment,
} from '@/hooks/queries/use-ideas';
import { formatDate, formatNumber, formatRelative, pluralize } from '@/lib/format';
import { routes } from '@/lib/routes';
import { toastSuccess } from '@/lib/toast';

export interface PostPanelProps {
  /** The open post; the screen keeps it while the panel animates out. */
  post: IdeaItem | null;
  /** The full record (body, roles, team, comments) when it is this post's; else the list item shows. */
  detail: StudioPostDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Where focus lands on close: the card link that opened the panel. */
  finalFocus?: SidePanelProps['finalFocus'];
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3 border-line border-t pt-5">
      <div className="flex min-h-6 items-center justify-between gap-3">
        <h3 className="text-small-strong text-ink">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function Chips({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <li
          key={item}
          className="inline-flex h-6 items-center rounded-full bg-table-head px-2.5 text-caption text-ink"
        >
          {item}
        </li>
      ))}
    </ul>
  );
}

/**
 * The post side panel on /dashboard/ideas?item=: the AI read (summary, fit with its reason, tags and
 * skills, thumbs on the read), the body at 68ch, roles, team, signals and the comment thread with its
 * box. Footer: Hide (confirmed) or Unhide, Rescore, and the panel's one coral Spotlight, full width.
 * Every change goes to the API; the hooks refresh the lists.
 */
export function PostPanel({ post, detail, open, onOpenChange, finalFocus }: PostPanelProps) {
  const [confirmHide, setConfirmHide] = useState(false);
  const noteId = useId();
  // The panel is mounted for good, so hooks take the last post's id (blank before the first open).
  const id = post?.id ?? '';
  const action = usePostAction();
  const feedback = usePostFeedback(id);
  const commenting = useStudioComment(id);
  const moderating = useModerateComment(id);
  if (!post) return null;

  const full = detail?.id === post.id ? detail : null;
  const { ai } = post;
  const verdict = feedback.isPending ? feedback.variables : (full?.feedback ?? null);
  const roles =
    full?.roles ??
    post.rolesNeeded.map((role) => ({
      role,
      filled: !post.openRoles.includes(role),
      filledBy: null,
      requestCount: 0,
    }));
  const team = full
    ? full.team
        .filter((member) => member.status === 'accepted')
        .map((member) => ({ name: member.name, image: member.image, note: member.role }))
    : post.teamPreview.map((member) => ({
        name: member.name,
        image: member.image,
        note: member.headline,
      }));

  const postId = post.id;
  const communityName = post.community.name;
  const rescoring = action.isPending && action.variables.action === 'rescore';

  function rescore() {
    action.mutate(
      { id: postId, action: 'rescore' },
      { onSuccess: () => toastSuccess('Rescoring with your current taste profile.') },
    );
  }

  function setHidden(hide: boolean) {
    action.mutate(
      { id: postId, action: hide ? 'hide' : 'unhide' },
      {
        onSuccess: () =>
          toastSuccess(
            hide ? `Hidden from the ${communityName} feed.` : `Back in the ${communityName} feed.`,
          ),
      },
    );
  }

  function rate(next: FeedbackVerdict) {
    const value = verdict === next ? null : next;
    feedback.mutate(value, {
      onSuccess: () => {
        if (value) toastSuccess('Thanks. Future reads learn from this.');
      },
    });
  }

  const reviewing = rescoring || ai.status === 'pending';

  return (
    <>
      <SidePanel
        open={open}
        onOpenChange={onOpenChange}
        finalFocus={finalFocus}
        title={post.title}
        status={
          <span className="flex flex-wrap gap-2">
            <StatusPill status={post.status} />
            {post.hidden ? <StatusPill status="hidden" /> : null}
          </span>
        }
        footer={
          <>
            {post.hidden ? (
              <Button
                variant="secondary"
                icon={<Eye />}
                loading={action.isPending && action.variables.action === 'unhide'}
                onClick={() => setHidden(false)}
              >
                Unhide
              </Button>
            ) : (
              <Button variant="destructive" icon={<EyeOff />} onClick={() => setConfirmHide(true)}>
                Hide
              </Button>
            )}
            <Button variant="secondary" icon={<RefreshCw />} loading={rescoring} onClick={rescore}>
              Rescore
            </Button>
            <div className="flex basis-full flex-col gap-2">
              <Button
                render={<Link href={routes.dashboard.promoteComposer(post.id)} />}
                icon={<Megaphone />}
                disabled={post.hidden}
                aria-describedby={post.hidden ? noteId : undefined}
                className="w-full"
              >
                Spotlight
              </Button>
              {post.hidden ? (
                <p id={noteId} className="text-small text-ink-muted">
                  Unhide this post to give it a spotlight.
                </p>
              ) : null}
            </div>
          </>
        }
      >
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <CommunityChip
              name={post.community.name}
              tint={post.community.tint}
              icon={post.community.icon}
            />
            <p className="text-small text-ink-muted">
              {POST_TYPE_LABELS[post.type]} by {post.author.name}, {formatDate(post.createdAt)}
            </p>
          </div>

          <Section
            title="AI read"
            action={
              reviewing ? null : (
                <div className="-my-2 flex items-center">
                  <Button
                    variant="ghost"
                    aria-label="This read is right"
                    aria-pressed={verdict === 'up'}
                    onClick={() => rate('up')}
                    className="aria-pressed:bg-white/70"
                  >
                    <ThumbsUp className={cn(verdict === 'up' && 'fill-current')} />
                  </Button>
                  <Button
                    variant="ghost"
                    aria-label="This read is off"
                    aria-pressed={verdict === 'down'}
                    onClick={() => rate('down')}
                    className="aria-pressed:bg-white/70"
                  >
                    <ThumbsDown className={cn(verdict === 'down' && 'fill-current')} />
                  </Button>
                </div>
              )
            }
          >
            {reviewing ? (
              <AiChip kind="reviewing" className="self-start" />
            ) : ai.status === 'failed' ? (
              <AiChip kind="not-analyzed" onRetry={rescore} className="self-start" />
            ) : (
              <>
                {ai.summary ? (
                  <p className="max-w-[68ch] text-body text-ink">{ai.summary}</p>
                ) : null}
                {ai.fitScore != null && ai.fitReason ? (
                  <div className="flex items-start gap-3">
                    <FitPill score={ai.fitScore} reason={ai.fitReason} className="shrink-0" />
                    <p className="text-small text-ink-soft">
                      {ai.fitReason}{' '}
                      <span className="tabular-nums">
                        (match score {Math.round(ai.fitScore)} of 100)
                      </span>
                    </p>
                  </div>
                ) : null}
                {ai.stale ? (
                  <p className="text-small text-ink-muted">
                    Scored with an older taste profile. Rescore to bring it up to date.
                  </p>
                ) : null}
              </>
            )}
            {ai.tags.length || ai.skills.length ? (
              <dl className="grid grid-cols-[auto_1fr] items-start gap-x-4 gap-y-2">
                {ai.tags.length ? (
                  <>
                    <dt className="pt-0.5 text-small text-ink-muted">Tags</dt>
                    <dd>
                      <Chips items={ai.tags} />
                    </dd>
                  </>
                ) : null}
                {ai.skills.length ? (
                  <>
                    <dt className="pt-0.5 text-small text-ink-muted">Skills</dt>
                    <dd>
                      <Chips items={ai.skills} />
                    </dd>
                  </>
                ) : null}
              </dl>
            ) : null}
          </Section>

          <Section title={POST_TYPE_LABELS[post.type]}>
            <p className="max-w-[68ch] text-body whitespace-pre-line text-ink">
              {full?.body ?? post.excerpt}
            </p>
            {full?.links.length ? (
              <ul className="flex flex-col gap-1">
                {full.links.map((link) => (
                  <li key={link.url}>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-body text-ink underline underline-offset-4"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </Section>

          <Section title="Open spots">
            {roles.length ? (
              <ul className="flex flex-col">
                {roles.map((slot) => (
                  <li
                    key={slot.role}
                    className="flex min-h-11 items-center justify-between gap-3 border-line-row border-b py-2 last:border-b-0"
                  >
                    <span className="text-body text-ink">{slot.role}</span>
                    <span className="flex items-center gap-2">
                      {slot.filled && slot.filledBy ? (
                        <span className="text-small text-ink-muted">{slot.filledBy.name}</span>
                      ) : null}
                      {!slot.filled && slot.requestCount ? (
                        <span className="text-small text-ink-muted">
                          {formatNumber(slot.requestCount)}{' '}
                          {pluralize(slot.requestCount, 'request')}
                        </span>
                      ) : null}
                      <StatusPill status={slot.filled ? 'filled' : 'open'} />
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-body text-ink-muted">No open spots.</p>
            )}
          </Section>

          <Section title={`Crew (${formatNumber(post.teamSize)})`}>
            {team.length ? (
              <ul className="flex flex-col gap-3">
                {team.map((member) => (
                  <li key={member.name} className="flex items-center gap-3">
                    <AvatarInitials name={member.name} image={member.image} size={28} />
                    <span className="min-w-0">
                      <span className="block text-small-strong text-ink">{member.name}</span>
                      {member.note ? (
                        <span className="block text-small text-ink-muted">{member.note}</span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-body text-ink-muted">No one has joined the crew yet.</p>
            )}
          </Section>

          <Section title="What fans said">
            <dl className="grid grid-cols-2 gap-3">
              <div>
                <dt className="text-small text-ink-muted">Would use this</dt>
                <dd className="text-count text-ink-soft">{formatNumber(post.useCount)}</dd>
              </div>
              <div>
                <dt className="text-small text-ink-muted">Count me in</dt>
                <dd className="text-count text-ink-soft">{formatNumber(post.buildCount)}</dd>
              </div>
            </dl>
          </Section>

          <Section title={`Comments (${formatNumber(full?.comments.length ?? post.commentCount)})`}>
            {full?.comments.length ? (
              <ul className="flex flex-col gap-4">
                {full.comments.map((comment) => (
                  <li key={comment.id} className="flex gap-3">
                    <AvatarInitials
                      name={comment.author.name}
                      image={comment.author.image}
                      size={28}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-small">
                        <span className="text-small-strong text-ink">{comment.author.name}</span>{' '}
                        <span className="text-ink-muted">{formatRelative(comment.createdAt)}</span>
                        {comment.hidden ? (
                          <span className="text-ink-muted"> · Hidden from fans</span>
                        ) : null}
                      </p>
                      <p
                        className={cn(
                          'mt-1 max-w-[68ch] text-body',
                          comment.hidden ? 'text-ink-muted' : 'text-ink',
                        )}
                      >
                        {comment.body}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="md"
                      icon={comment.hidden ? <Eye /> : <EyeOff />}
                      aria-label={`${comment.hidden ? 'Unhide' : 'Hide'} ${comment.author.name}'s comment`}
                      disabled={moderating.isPending}
                      onClick={() =>
                        moderating.mutate({
                          commentId: comment.id,
                          action: comment.hidden ? 'unhide' : 'hide',
                        })
                      }
                    >
                      {comment.hidden ? 'Unhide' : 'Hide'}
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-body text-ink-muted">
                {full || post.commentCount === 0
                  ? 'No comments yet.'
                  : 'The thread shows once the full post loads.'}
              </p>
            )}
            {full ? (
              <CommentForm
                onComment={(body) => commenting.mutate({ body })}
                submitVariant="secondary"
                className="mt-1"
              />
            ) : null}
          </Section>
          {full ? <SimilarSection postId={postId} scope="studio" /> : null}
        </div>
      </SidePanel>

      <ConfirmDialog
        open={confirmHide}
        onOpenChange={setConfirmHide}
        title="Hide this post?"
        body={`Fans in ${post.community.name} stop seeing it in their feed. It stays here, marked Hidden, and you can unhide it at any time.`}
        confirmLabel="Hide post"
        icon={<EyeOff />}
        onConfirm={() => setHidden(true)}
      />
    </>
  );
}
