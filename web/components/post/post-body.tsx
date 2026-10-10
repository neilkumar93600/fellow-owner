'use client';

import {
  LIMITS,
  POST_TYPE_LABELS,
  type PostDetail,
  postBodySchema,
  postTitleSchema,
} from '@fellow-owners/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { ExternalLink, Pencil, Trash2, Trophy } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useId, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { AvatarInitials } from '@/components/shared/avatar-initials';
import { CommunityChip } from '@/components/shared/community-chip';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { SignalButtons } from '@/components/shared/signal-buttons';
import { StatusPill } from '@/components/shared/status-pill';
import { Button } from '@/components/ui/button';
import { buttonVariants } from '@/components/ui/button-variants';
import { cn } from '@/components/ui/cn';
import { Field, TextArea, TextField } from '@/components/ui/field';
import { useDeletePost, useSignal, useUpdatePost } from '@/hooks/queries/use-post';
import { useSpacePage } from '@/hooks/queries/use-space-page';
import { formatRelative } from '@/lib/format';
import { routes } from '@/lib/routes';
import { toastSuccess } from '@/lib/toast';
import { LovedBadge } from './loved-badge';
import { TeamRoles } from './team-roles';

const editSchema = z.object({ title: postTitleSchema, body: postBodySchema });
type PostContent = z.output<typeof editSchema>;

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/**
 * The post card on strong glass, in the brief's order: community, type, "Loved by Mira" and status, the
 * title (the page's h1), author and date, the body at 68ch, links, Open spots and The crew (fan projects),
 * the two signals, then the author's Edit (inline, within 24 hours) and Delete (confirmed).
 */
export function PostBody({ handle, post }: { handle: string; post: PostDetail }) {
  const router = useRouter();
  const update = useUpdatePost();
  const remove = useDeletePost();
  const signal = useSignal();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const editRef = useRef<HTMLButtonElement>(null);
  const editNoteId = useId();
  const creator = useSpacePage(handle).data?.space.displayName.split(' ')[0] ?? 'the creator';

  function closeEditor() {
    setEditing(false);
    requestAnimationFrame(() => editRef.current?.focus());
  }

  function save(content: PostContent) {
    update.mutate(
      { postId: post.id, ...content },
      {
        onSuccess: () => {
          toastSuccess('Post updated');
          closeEditor();
        },
      },
    );
  }

  return (
    <article aria-labelledby="post-title" className="min-w-0 glass-strong p-6 sm:p-8">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <CommunityChip
          name={post.community.name}
          tint={post.community.tint}
          icon={post.community.icon}
        />
        <span className="text-small text-ink-soft">{POST_TYPE_LABELS[post.type]}</span>
        {post.lovedAt ? <LovedBadge creator={creator} /> : null}
        {post.challenge ? (
          <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-aurora-lilac px-3 text-caption text-ink">
            <Trophy aria-hidden="true" strokeWidth={1.5} className="size-3.5" />
            Entry: {post.challenge.title}
          </span>
        ) : null}
        <StatusPill status={post.status} className="ml-auto" />
      </div>

      <h1 id="post-title" className="mt-4 text-h1 text-ink">
        {post.title}
      </h1>

      <div className="mt-4 flex items-center gap-3">
        <AvatarInitials name={post.author.name} image={post.author.image} />
        <div className="min-w-0">
          <p className="truncate text-label-strong text-ink">{post.author.name}</p>
          <p className="text-small text-ink-soft">
            {post.author.headline ? `${post.author.headline} · ` : null}
            <time dateTime={post.createdAt} suppressHydrationWarning>
              {formatRelative(post.createdAt)}
            </time>
          </p>
        </div>
      </div>

      {editing ? (
        <PostEditor
          initial={{ title: post.title, body: post.body }}
          saving={update.isPending}
          onSave={save}
          onCancel={closeEditor}
        />
      ) : (
        <p className="mt-6 max-w-[68ch] whitespace-pre-line text-body text-ink">{post.body}</p>
      )}

      {post.links.length ? (
        <ul aria-label="Links" className="mt-5 flex flex-wrap gap-2">
          {post.links.map((link) => (
            <li key={link.url} className="max-w-full">
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(buttonVariants({ variant: 'secondary' }), 'h-11 max-w-full px-4')}
              >
                <ExternalLink aria-hidden="true" className="size-4" />
                <span className="truncate">{link.label}</span>
                <span className="truncate text-small text-ink-soft">{hostname(link.url)}</span>
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            </li>
          ))}
        </ul>
      ) : null}

      {post.type === 'project' ? <TeamRoles post={post} /> : null}

      <div className="mt-6 border-t border-ink/10 pt-6">
        <SignalButtons
          useCount={post.useCount}
          buildCount={post.buildCount}
          viewerSignals={post.viewerSignals}
          disabled={post.isAuthor}
          disabledReason="Signals come from other fans."
          onToggle={(kind, on) => signal.mutate({ postId: post.id, kind, on })}
        />
      </div>

      {post.isAuthor && !editing ? (
        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-ink/10 pt-6">
          <Button
            ref={editRef}
            variant="secondary"
            icon={<Pencil />}
            className="h-11"
            disabled={!post.canEdit}
            aria-describedby={post.canEdit ? undefined : editNoteId}
            onClick={() => setEditing(true)}
          >
            Edit
          </Button>
          <Button
            variant="destructive"
            icon={<Trash2 />}
            className="h-11"
            // Stays busy after success too, while the page navigates away from the deleted post.
            loading={remove.isPending || remove.isSuccess}
            onClick={() => setConfirmDelete(true)}
          >
            Delete
          </Button>
          {post.canEdit ? null : (
            <p id={editNoteId} className="text-small text-ink-soft">
              Editing closes 24 hours after posting.
            </p>
          )}
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this post?"
        body={`It comes off the ${post.community.name} feed now, with its comments and crew requests.`}
        confirmLabel="Delete post"
        icon={<Trash2 />}
        onConfirm={() => {
          remove.mutate(post.id, {
            onSuccess: () => {
              toastSuccess('Post deleted');
              router.push(routes.fan.community(handle, post.community.slug));
            },
          });
        }}
      />
    </article>
  );
}

/** Inline edit of the title and body; Save is secondary because Comment is the screen's coral. */
function PostEditor({
  initial,
  saving,
  onSave,
  onCancel,
}: {
  initial: PostContent;
  saving: boolean;
  onSave: (saved: PostContent) => void;
  onCancel: () => void;
}) {
  const {
    register,
    watch,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(editSchema), defaultValues: initial });

  return (
    <form
      noValidate
      aria-label="Edit post"
      onSubmit={handleSubmit(onSave)}
      className="mt-6 flex flex-col gap-5"
    >
      <Field
        label="Title"
        count={{ value: watch('title').length, max: LIMITS.post.title.max }}
        error={errors.title?.message}
      >
        <TextField {...register('title')} autoFocus />
      </Field>
      <Field
        label="Details"
        count={{ value: watch('body').length, max: LIMITS.post.body.max }}
        error={errors.body?.message}
      >
        <TextArea {...register('body')} rows={8} />
      </Field>
      <div className="flex flex-wrap gap-3">
        <Button type="submit" variant="secondary" className="h-11" loading={saving}>
          Save changes
        </Button>
        <Button
          variant="ghost"
          size="lg"
          surface="glass"
          className="h-11"
          disabled={saving}
          onClick={onCancel}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
