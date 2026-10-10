import type {
  MarkNotificationsReadInput,
  NotificationsPage,
  NotificationsQuery,
  UnreadCount,
} from '@fellow-owners/shared';
import { type Params, query } from '@/api/studio';
import { apiFetch } from '@/lib/fetcher';

// Typed client for /api/notifications (any signed-in user): the bell (F21).

export type NotificationsParams = Params<NotificationsQuery>;

/** GET / : newest first; `space` (a handle) narrows to one space. */
export function getNotifications(
  params: NotificationsParams = {},
  signal?: AbortSignal,
): Promise<NotificationsPage> {
  return apiFetch<NotificationsPage>(`/api/notifications${query(params)}`, { signal });
}

/** GET /unread : the badge count. */
export function getUnreadCount(space?: string | null, signal?: AbortSignal): Promise<UnreadCount> {
  return apiFetch<UnreadCount>(`/api/notifications/unread${query({ space })}`, { signal });
}

/** GET /stream : Server-Sent Events for EventSource; each `unread` event carries an UnreadCount. */
export function unreadStreamUrl(space?: string | null): string {
  return `/api/notifications/stream${query({ space })}`;
}

/** POST /read : the given ids, or all (within `space` when given); answers the new count. */
export function markNotificationsRead(
  input: MarkNotificationsReadInput = {},
): Promise<UnreadCount> {
  return apiFetch<UnreadCount>('/api/notifications/read', { method: 'POST', json: input });
}
