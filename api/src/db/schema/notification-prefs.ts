import type { EmailNotificationKind } from '@fellow-owners/shared';
import { boolean, jsonb, pgTable, text } from 'drizzle-orm/pg-core';
import { user } from './auth.js';
import { timestamptz, updatedAt } from './columns.js';

/**
 * Email channel settings per user. No row = defaults (email on, every kind on).
 * `kinds` holds only the kinds the user changed. `last_digest_at`: the hourly digest's watermark.
 */
export const notificationPrefs = pgTable('notification_prefs', {
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  emailEnabled: boolean('email_enabled').notNull().default(true),
  kinds: jsonb('kinds')
    .$type<Partial<Record<EmailNotificationKind, boolean>>>()
    .notNull()
    .default({}),
  /** One-click unsubscribe from an email footer. */
  unsubscribedAt: timestamptz('unsubscribed_at'),
  lastDigestAt: timestamptz('last_digest_at'),
  updatedAt: updatedAt(),
});

export type NotificationPrefsRow = typeof notificationPrefs.$inferSelect;
export type NewNotificationPrefsRow = typeof notificationPrefs.$inferInsert;
