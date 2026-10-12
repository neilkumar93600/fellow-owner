'use client';

import type { CommentItem } from '@fellow-owners/shared';
import { Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { AvatarInitials } from '@/components/shared/avatar-initials';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { ReportButton } from '@/components/shared/report-button';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/ui/cn';
import {
  isPendingComment,
  useAddComment,
  useDeleteComment,
  useEarlierComments,
} from '@/hooks/queries/use-post';
import { formatNumber, formatRelative } from '@/lib/format';
import { toastSuccess } from '@/lib/toast';
import { CommentForm } from './comment-form';

/**
 * The comments card: the thread oldest first, then the comment box. The post holds the newest comments;
 * Show earlier comments adds older ones on top while `commentCount` says some are missing. A new comment
 * joins the thread at once (muted until the API has it); its author can delete it, after a confirmation.
 */
export function CommentThread({
  handle,
  postId,
  comments,
  commentCount,
}: {
  handle: string;
  postId: string;
  comments: CommentItem[];
  /** PostDetail.commentCount: every comment members can see, loaded or not. */
  commentCount: number;
}) {
  const add = useAddComment(handle);
  const remove = useDeleteComment();
  const earlier = useEarlierComments(postId);
  const [removing, setRemoving] = useState<CommentItem | null>(null);
  // The oldest id when a page said nothing older is left (a refetch of the post shows the button again).
  const [doneBefore, setDoneBefore] = useState<string | null>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const oldest = comments[0];
  const canLoadEarlier =
    oldest !== undefined &&
    !isPendingComment(oldest) &&
    comments.length < commentCount &&
    oldest.id !== doneBefore;

  return (
    <section aria-labelledby="comments-title" className="min-w-0 glass-strong p-6 sm:p-8">
      <h2
        id="comments-title"
        ref={titleRef}
        tabIndex={-1}
        className="flex items-baseline gap-2 text-h2 text-ink outline-none"
      >
        Comments
        <span className="text-ink-soft tabular-nums">
          {formatNumber(Math.max(commentCount, comments.length))}
        </span>
      </h2>
      {canLoadEarlier ? (
        <Button
          variant="ghost"
          surface="glass"
          className="mt-2 -ml-4"
          loading={earlier.isPending}
          onClick={() =>
            earlier.mutate(oldest.id, {
              onSuccess: (page) => {
                if (!page.nextCursor) setDoneBefore(page.items[0]?.id ?? oldest.id);
              },
            })
          }
        >
          Show earlier comments
        </Button>
      ) : null}
      {comments.length ? (
        <ol className="mt-2 divide-y divide-ink/10">
          {comments.map((comment) => {
            const pending = isPendingComment(comment);
            return (
              <li key={comment.id} aria-busy={pending} className="flex gap-3 py-4">
                <AvatarInitials name={comment.author.name} image={comment.author.image} />
                <div className={cn('min-w-0 flex-1', pending && 'opacity-60')}>
                  <p className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-small-strong text-ink">{comment.author.name}</span>
                    {comment.isOwn ? <span className="text-small text-ink-soft">(you)</span> : null}
                    <time
                      dateTime={comment.createdAt}
                      suppressHydrationWarning
                      className="text-small text-ink-soft"
                    >
                      {formatRelative(comment.createdAt)}
                    </time>
                  </p>
                  <p className="mt-1 max-w-[68ch] whitespace-pre-line break-words text-body text-ink">
                    {comment.body}
                  </p>
                </div>
                {comment.isOwn && !pending ? (
                  <Button
                    variant="ghost"
                    size="icon-fan"
                    surface="glass"
                    aria-label={`Delete your comment: ${comment.body.slice(0, 40)}`}
                    loading={remove.isPending && remove.variables?.commentId === comment.id}
                    onClick={() => setRemoving(comment)}
                  >
                    <Trash2 />
                  </Button>
                ) : null}
                {comment.isOwn || pending ? null : (
                  <ReportButton target="comment" id={comment.id} />
                )}
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="mt-2 text-body text-ink-soft">
          No comments yet. Ask a question or offer to help.
        </p>
      )}
      <CommentForm
        onComment={(body) =>
          add.mutate({ postId, body }, { onSuccess: () => toastSuccess('Comment posted') })
        }
        className="mt-6 border-t border-ink/10 pt-6"
      />
      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(open) => {
          if (!open) setRemoving(null);
        }}
        title="Delete this comment?"
        body="It comes off the thread now. This can't be undone."
        confirmLabel="Delete comment"
        icon={<Trash2 />}
        onConfirm={() => {
          if (!removing) return;
          remove.mutate(
            { postId, commentId: removing.id },
            // The deleted row held focus; the heading is the nearest stop.
            { onSuccess: () => titleRef.current?.focus() },
          );
        }}
      />
    </section>
  );
}
