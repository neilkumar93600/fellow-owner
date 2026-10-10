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

/**
 * POST /api/email/unsubscribe?token= : the button on /email-preferences behind the emailed link
 * (opening the link changes nothing). 400 for a bad token.
 */
export function unsubscribeWithToken(token: string): Promise<{ unsubscribed: true }> {
  return apiFetch<{ unsubscribed: true }>(
    `/api/email/unsubscribe?token=${encodeURIComponent(token)}`,
    { method: 'POST' },
  );
}
