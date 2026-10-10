import type { EmailNotificationKind } from '@fellow-owners/shared';
import { and, asc, eq, gt, inArray, isNull, lt, notLike, sql } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { user } from '../db/schema/auth.js';
import { notifications } from '../db/schema/later.js';
import { type NotificationPrefsRow, notificationPrefs } from '../db/schema/notification-prefs.js';
import { spaces } from '../db/schema/spaces.js';

/** One unread notification that is due in a user's next digest email. */
export interface DigestRow {
  userId: string;
  email: string;
  name: string;
  kind: string;
  payload: Record<string, unknown>;
  createdAt: Date;
  spaceHandle: string;
  spaceDisplayName: string;
}

/** Rows read per digest run (the next run takes the rest). */
const DIGEST_ROW_LIMIT = 5000;

/** notification_prefs: the email channel per user. No row = defaults (see the table comment). */
export function createNotificationPrefsRepo(db: Db) {
  return {
    async get(userId: string): Promise<NotificationPrefsRow | null> {
      const [row] = await db
        .select()
        .from(notificationPrefs)
        .where(eq(notificationPrefs.userId, userId))
        .limit(1);
      return row ?? null;
    },

    /** Saves the switches. Turning emails on again clears an earlier unsubscribe. */
    async upsert(
      userId: string,
      values: { emailEnabled: boolean; kinds: Partial<Record<EmailNotificationKind, boolean>> },
    ): Promise<NotificationPrefsRow> {
      const [row] = await db
        .insert(notificationPrefs)
        .values({ userId, ...values })
        .onConflictDoUpdate({
          target: notificationPrefs.userId,
          set: {
            ...values,
            unsubscribedAt: values.emailEnabled ? null : sql`${notificationPrefs.unsubscribedAt}`,
            updatedAt: new Date(),
          },
        })
        .returning();
      if (!row) throw new Error('notification_prefs upsert returned no row');
      return row;
    },

    /** One-click unsubscribe. False when the user no longer exists. */
    async markUnsubscribed(userId: string, at: Date): Promise<boolean> {
      const rows = await db.execute(sql`
        insert into notification_prefs (user_id, unsubscribed_at)
        select id, ${at.toISOString()}::timestamptz from "user" where id = ${userId}
        on conflict (user_id) do update set unsubscribed_at = excluded.unsubscribed_at, updated_at = now()
        returning user_id`);
      return rows.length > 0;
    },

    /** Moves the digest watermark; the next digest starts after `at`. */
    async setLastDigestAt(userId: string, at: Date): Promise<void> {
      await db
        .insert(notificationPrefs)
        .values({ userId, lastDigestAt: at })
        .onConflictDoUpdate({
          target: notificationPrefs.userId,
          set: { lastDigestAt: at, updatedAt: new Date() },
        });
    },

    /**
     * Unread notifications of `kinds` that belong in a digest: created after the user's watermark
     * (and after `since`, so a first run does not mail a backlog) but before `olderThan` (so
     * people reading live are not emailed), for users with email on, not unsubscribed, and the
     * kind not switched off. Demo and seed addresses (@example.com) never match. Oldest first.
     */
    async dueDigestRows(opts: {
      kinds: readonly EmailNotificationKind[];
      olderThan: Date;
      since: Date;
    }): Promise<DigestRow[]> {
      const rows = await db
        .select({
          userId: notifications.userId,
          email: user.email,
          name: user.name,
          kind: notifications.kind,
          payload: notifications.payload,
          createdAt: notifications.createdAt,
          spaceHandle: spaces.handle,
          spaceDisplayName: spaces.displayName,
        })
        .from(notifications)
        .innerJoin(user, eq(user.id, notifications.userId))
        .innerJoin(spaces, eq(spaces.id, notifications.spaceId))
        .leftJoin(notificationPrefs, eq(notificationPrefs.userId, notifications.userId))
        .where(
          and(
            isNull(notifications.readAt),
            inArray(notifications.kind, [...opts.kinds]),
            lt(notifications.createdAt, opts.olderThan),
            gt(notifications.createdAt, opts.since),
            sql`${notifications.createdAt} > coalesce(${notificationPrefs.lastDigestAt}, '-infinity'::timestamptz)`,
            sql`coalesce(${notificationPrefs.emailEnabled}, true)`,
            isNull(notificationPrefs.unsubscribedAt),
            sql`coalesce((${notificationPrefs.kinds} ->> ${notifications.kind})::boolean, true)`,
            notLike(sql`lower(${user.email})`, '%@example.com'),
          ),
        )
        .orderBy(asc(notifications.userId), asc(notifications.createdAt), asc(notifications.id))
        .limit(DIGEST_ROW_LIMIT);
      // ponytail: at the cap the last user may be cut short; leave them to the next run.
      if (rows.length < DIGEST_ROW_LIMIT) return rows;
      const last = rows[rows.length - 1]?.userId;
      return rows.filter((r) => r.userId !== last);
    },
  };
}

export type NotificationPrefsRepo = ReturnType<typeof createNotificationPrefsRepo>;
