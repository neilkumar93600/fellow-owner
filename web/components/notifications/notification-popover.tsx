'use client';

import type { NotificationItem } from '@fellow-owners/shared';
import {
  Bell,
  Heart,
  Lightbulb,
  Loader2,
  type LucideIcon,
  Megaphone,
  Sparkles,
  Star,
  Trophy,
  UserPlus,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useRef } from 'react';
import { cn } from '@/components/ui/cn';
import { useMarkNotificationsRead } from '@/hooks/queries/use-notifications';
import { formatRelative } from '@/lib/format';

/** One icon per kind, so a row says what happened before the words are read (decorative: the text carries it). */
const KIND_ICON: Record<NotificationItem['kind'], LucideIcon> = {
  reply_received: Megaphone,
  project_featured: Star,
  team_request: UserPlus,
  team_decision: UserPlus,
  ask_posted: Trophy,
  idea_posted: Lightbulb,
  pitch_received: Lightbulb,
  comment_received: Bell,
  post_loved: Heart,
  spotlighted: Sparkles,
  challenge_shortlisted: Trophy,
};

export interface NotificationPopoverProps {
  items: NotificationItem[];
  unreadCount: number;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isLoading: boolean;
  isError?: boolean;
  /** The space handle the list is scoped to, so "Mark all read" matches the count. */
  space?: string | null;
  onLoadMore: () => void;
  onOpenChange?: (open: boolean) => void;
}

/** The notification list inside the popover, with "Load more" and a "Mark all read" button. */
export function NotificationPopoverContent({
  items,
  unreadCount,
  hasNextPage,
  isFetchingNextPage,
  isLoading,
  isError = false,
  space,
  onLoadMore,
  onOpenChange,
}: NotificationPopoverProps) {
  const markRead = useMarkNotificationsRead();
  const observerRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for "load more" at the bottom
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          onLoadMore();
        }
      },
      { threshold: 0.1 },
    );

    if (observerRef.current) observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, onLoadMore]);

  const handleMarkAllRead = useCallback(() => {
    markRead.mutate(space ? { space } : {});
  }, [markRead, space]);

  const handleItemClick = useCallback(
    (item: NotificationItem) => {
      // Fire and forget: the link navigates either way.
      if (!item.readAt) markRead.mutate({ ids: [item.id] });
      onOpenChange?.(false);
    },
    [markRead, onOpenChange],
  );

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="animate-spin text-ink-soft" />
      </div>
    );
  }

  if (isError && items.length === 0) {
    return (
      <p role="alert" className="py-8 text-center text-body text-ink-soft">
        Couldn&apos;t load notifications. Close and reopen to try again.
      </p>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex h-32 flex-col items-center justify-center gap-2 text-center">
        <p className="text-body text-ink-soft">No notifications yet</p>
        <p className="text-caption text-ink-soft">You&apos;ll see updates here</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Header with "Mark all read" button */}
      {unreadCount > 0 && (
        <div className="flex items-center justify-between border-b border-ink/10 px-2 pb-2">
          <p className="text-label text-ink-soft">{unreadCount} unread</p>
          <button
            type="button"
            onClick={handleMarkAllRead}
            disabled={markRead.isPending}
            className={cn(
              'inline-flex min-h-11 items-center text-label text-ink underline underline-offset-4 transition-colors',
              'hover:text-coral-hover disabled:text-ink-soft',
            )}
          >
            Mark all read
          </button>
        </div>
      )}

      {/* Notification items */}
      <ul className="max-h-96 overflow-y-auto">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={item.href}
              onClick={() => handleItemClick(item)}
              className={cn(
                'group flex min-h-11 items-start gap-3 rounded-xl px-2 py-2 transition-colors',
                'hover:bg-white/70',
                item.readAt ? 'text-ink-soft' : 'text-ink',
              )}
            >
              <KindIcon kind={item.kind} unread={!item.readAt} />

              {/* Content */}
              <div className="min-w-0 flex-1">
                <p className="text-body leading-snug">{item.text}</p>
                <p className="mt-0.5 text-caption text-ink-soft">
                  {formatRelative(item.createdAt)}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {/* Load more observer */}
      {hasNextPage && (
        <div ref={observerRef} className="flex justify-center py-2">
          {isFetchingNextPage ? (
            <Loader2 className="h-4 w-4 animate-spin text-ink-soft" />
          ) : (
            <button
              type="button"
              onClick={onLoadMore}
              className="inline-flex min-h-11 items-center text-label text-ink underline underline-offset-4 hover:text-coral-hover"
            >
              Load more
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** The kind's icon on a soft tile; unread items add a 6px coral dot (not colour alone: unread text is also full ink). */
function KindIcon({ kind, unread }: { kind: NotificationItem['kind']; unread: boolean }) {
  const Icon = KIND_ICON[kind] ?? Bell;
  return (
    <span
      aria-hidden="true"
      className="relative mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-aurora-peach"
    >
      <Icon strokeWidth={1.5} className="size-4 text-ink" />
      {unread ? (
        <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-coral ring-2 ring-white" />
      ) : null}
    </span>
  );
}
