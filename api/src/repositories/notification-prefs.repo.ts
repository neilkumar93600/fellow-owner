import type { Db } from '../db/client.js';

/** notification_prefs (email channel per user). Stub: F12 adds the queries. */
export function createNotificationPrefsRepo(_db: Db) {
  return {};
}

export type NotificationPrefsRepo = ReturnType<typeof createNotificationPrefsRepo>;
