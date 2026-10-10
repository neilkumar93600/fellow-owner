import { and, count, desc, eq, inArray, isNotNull, isNull, lt, sql } from 'drizzle-orm';
import type { Db, DbOrTx } from '../db/client.js';
import {
  type NewNotificationRow,
  type NotificationRow,
  notifications,
} from '../db/schema/later.js';
import { spaces } from '../db/schema/spaces.js';
import type { TimeCursor } from '../lib/pagination.js';

/** A notification with its space handle (NotificationItem.spaceHandle and hrefs). */
export interface NotificationWithSpace extends NotificationRow {
  spaceHandle: string;
  spaceDisplayName: string;
}

/** In-app notifications (notifications table). */
export function createNotificationsRepo(db: Db) {
  return {
    async insert(values: NewNotificationRow, tx: DbOrTx = db): Promise<NotificationRow> {
      const [row] = await tx.insert(notifications).values(values).returning();
      if (!row) throw new Error('notifications insert returned no row');
      return row;
    },

    /** True when the user already has a `kind` notification about this post (payload.postId). */
    async existsForPost(
      userId: string,
      kind: NotificationRow['kind'],
      postId: string,
      tx: DbOrTx = db,
    ): Promise<boolean> {
      const [row] = await tx
        .select({ id: notifications.id })
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, userId),
            eq(notifications.kind, kind),
            sql`${notifications.payload}->>'postId' = ${postId}`,
          ),
        )
        .limit(1);
      return row !== undefined;
    },

    /** The user's notifications, newest first, keyset on (created_at, id); optionally one space. */
    async list(
      userId: string,
      filter: { spaceId?: string; cursor: TimeCursor | null; limit: number },
      tx: DbOrTx = db,
    ): Promise<NotificationWithSpace[]> {
      const { spaceId, cursor, limit } = filter;
      const rows = await tx
        .select({
          notification: notifications,
          spaceHandle: spaces.handle,
          spaceDisplayName: spaces.displayName,
        })
        .from(notifications)
        .innerJoin(spaces, eq(spaces.id, notifications.spaceId))
        .where(
          and(
            eq(notifications.userId, userId),
            spaceId ? eq(notifications.spaceId, spaceId) : undefined,
            cursor
              ? sql`(${notifications.createdAt}, ${notifications.id}) < (${cursor.createdAt.toISOString()}::timestamptz, ${cursor.id}::uuid)`
              : undefined,
          ),
        )
        .orderBy(desc(notifications.createdAt), desc(notifications.id))
        .limit(limit);
      return rows.map((r) => ({
        ...r.notification,
        spaceHandle: r.spaceHandle,
        spaceDisplayName: r.spaceDisplayName,
      }));
    },

    async countUnread(userId: string, spaceId?: string, tx: DbOrTx = db): Promise<number> {
      const [row] = await tx
        .select({ n: count() })
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, userId),
            isNull(notifications.readAt),
            spaceId ? eq(notifications.spaceId, spaceId) : undefined,
          ),
        );
      return row?.n ?? 0;
    },

    /** Sets read_at on the user's unread rows (only `ids` when given, only `spaceId` when given). */
    async markRead(
      userId: string,
      filter: { ids?: string[]; spaceId?: string },
      tx: DbOrTx = db,
    ): Promise<number> {
      const rows = await tx
        .update(notifications)
        .set({ readAt: new Date() })
        .where(
          and(
            eq(notifications.userId, userId),
            isNull(notifications.readAt),
            filter.ids ? inArray(notifications.id, filter.ids) : undefined,
            filter.spaceId ? eq(notifications.spaceId, filter.spaceId) : undefined,
          ),
        )
        .returning({ id: notifications.id });
      return rows.length;
    },

    /** Purge: read notifications older than `before`. */
    async deleteReadBefore(before: Date, tx: DbOrTx = db): Promise<number> {
      const rows = await tx
        .delete(notifications)
        .where(and(isNotNull(notifications.readAt), lt(notifications.createdAt, before)))
        .returning({ id: notifications.id });
      return rows.length;
    },
  };
}

export type NotificationsRepo = ReturnType<typeof createNotificationsRepo>;
