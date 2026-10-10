'use client';

import type {
  MarkNotificationsReadInput,
  NotificationsPage,
  UnreadCount,
} from '@fellow-owners/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import {
  getNotifications,
  getUnreadCount,
  markNotificationsRead,
  unreadStreamUrl,
} from '@/api/notifications';
import { useInfiniteCursor } from '@/hooks/use-cursor-list';

export const notificationsKeys = {
  all: ['notifications'] as const,
  unread: ['notifications', 'unread'] as const,
  unreadSpace: (space: string | null) => ['notifications', 'unread', space] as const,
  lists: ['notifications', 'list'] as const,
  list: (space: string | null) => ['notifications', 'list', space] as const,
};

/**
 * The unread count, live: one EventSource per mounted bell (GET /api/notifications/stream) pushes it
 * after every change and also refreshes the list, so an open popover updates. While the stream is
 * down (EventSource retries on its own) the count is polled every 30s instead, paused in background
 * tabs and refetched on window focus. When space is null, counts across all the user's spaces.
 * ponytail: one stream per tab (the API allows 5 per user); share one across tabs (BroadcastChannel)
 * if that cap bites.
 */
export function useUnreadCount(space: string | null = null) {
  const queryClient = useQueryClient();
  const [live, setLive] = useState(false);

  useEffect(() => {
    const source = new EventSource(unreadStreamUrl(space));
    source.addEventListener('unread', (event) => {
      const count = JSON.parse(event.data) as UnreadCount;
      queryClient.setQueryData(notificationsKeys.unreadSpace(space), count);
      void queryClient.invalidateQueries({ queryKey: notificationsKeys.list(space) });
      setLive(true);
    });
    source.addEventListener('error', () => setLive(false));
    return () => {
      source.close();
      setLive(false);
    };
  }, [queryClient, space]);

  return useQuery({
    queryKey: notificationsKeys.unreadSpace(space),
    queryFn: ({ signal }) => getUnreadCount(space, signal),
    refetchInterval: live ? false : 30_000,
    staleTime: 15_000,
  });
}

/**
 * The notifications list with "load more" for the given space (or all spaces if null).
 * Enabled only when explicitly requested (e.g., popover opens).
 */
export function useNotifications(space: string | null = null, enabled: boolean = false) {
  const list = useInfiniteCursor<NotificationsPage>({
    queryKey: notificationsKeys.list(space),
    fetchPage: (cursor, signal) => getNotifications({ space: space ?? undefined, cursor }, signal),
    enabled,
  });
  return list;
}

/**
 * Mark notifications as read. When ids are omitted, marks all unread within the space (or globally).
 * On success, invalidates the counts and lists.
 */
export function useMarkNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: MarkNotificationsReadInput) => markNotificationsRead(input),
    // Counts and every list (a mark-all changes readAt on rows too).
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationsKeys.all }),
  });
}
