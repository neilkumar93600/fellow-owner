import type { SnoozeRefType } from '@fellow-owners/shared';
import { and, eq, gt } from 'drizzle-orm';
import type { Db, DbOrTx } from '../db/client.js';
import { studioSnoozes } from '../db/schema/snoozes.js';

/** studio_snoozes (Today "Later"). */
export function createSnoozesRepo(db: Db) {
  return {
    /** Snooze (or extend) one ref until `until`. */
    async upsert(
      spaceId: string,
      refType: SnoozeRefType,
      refId: string,
      until: Date,
      tx: DbOrTx = db,
    ): Promise<void> {
      await tx
        .insert(studioSnoozes)
        .values({ spaceId, refType, refId, until })
        .onConflictDoUpdate({
          target: [studioSnoozes.spaceId, studioSnoozes.refType, studioSnoozes.refId],
          set: { until },
        });
    },

    async remove(
      spaceId: string,
      refType: SnoozeRefType,
      refId: string,
      tx: DbOrTx = db,
    ): Promise<void> {
      await tx
        .delete(studioSnoozes)
        .where(
          and(
            eq(studioSnoozes.spaceId, spaceId),
            eq(studioSnoozes.refType, refType),
            eq(studioSnoozes.refId, refId),
          ),
        );
    },

    /** Ids of this type that are hidden right now. */
    async activeIds(
      spaceId: string,
      refType: SnoozeRefType,
      now: Date = new Date(),
      tx: DbOrTx = db,
    ): Promise<Set<string>> {
      const rows = await tx
        .select({ refId: studioSnoozes.refId })
        .from(studioSnoozes)
        .where(
          and(
            eq(studioSnoozes.spaceId, spaceId),
            eq(studioSnoozes.refType, refType),
            gt(studioSnoozes.until, now),
          ),
        );
      return new Set(rows.map((r) => r.refId));
    },
  };
}

export type SnoozesRepo = ReturnType<typeof createSnoozesRepo>;
