import type { NotificationPrefs, NotificationPrefsInput } from '@fellow-owners/shared';
import { apiFetch } from '@/lib/fetcher';

// Typed client for the signed-in person's notification email settings.

/** GET /api/me/notification-prefs : defaults to on for every kind. */
export function getNotificationPrefs(signal?: AbortSignal): Promise<NotificationPrefs> {
  return apiFetch<NotificationPrefs>('/api/me/notification-prefs', { signal });
}

/** PUT /api/me/notification-prefs */
export function updateNotificationPrefs(input: NotificationPrefsInput): Promise<NotificationPrefs> {
  return apiFetch<NotificationPrefs>('/api/me/notification-prefs', {
    method: 'PUT',
    json: input,
  });
}
