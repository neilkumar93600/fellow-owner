import { CLICK_PLATFORMS, type ClickPlatform } from '@fellow-owners/shared';
import { and, count, countDistinct, eq, inArray, lt, sql } from 'drizzle-orm';
import { chunk, type Db, type DbOrTx, inTransaction } from '../db/client.js';
import { clickEvents, type NewClickEventRow, promotions } from '../db/schema/promotions.js';

export interface NewClick {
  promotionId: string;
  platform: ClickPlatform;
  /** Host only, never the path. */
  referrerHost: string | null;
  /** lib/hash.ts visitorHash(ip, ua, day, CLICK_SALT). Never the raw IP. */
  visitorHash: string | null;
}

const emptyPlatforms = (): Record<ClickPlatform, number> =>
  Object.fromEntries(CLICK_PLATFORMS.map((p) => [p, 0])) as Record<ClickPlatform, number>;

export function createClicksRepo(db: Db) {
  return {
    /**
     * Inserts the click event and increments promotions.click_count in one transaction. A repeat
     * (same promotion, visitor hash and platform; the hash includes the UTC day) is dropped:
     * false, and the count is left alone.
     */
    async record(click: NewClick, tx?: DbOrTx): Promise<boolean> {
      return inTransaction(db, tx, async (t) => {
        const inserted = await t
          .insert(clickEvents)
          .values(click)
          .onConflictDoNothing()
          .returning({ id: clickEvents.id });
        if (inserted.length === 0) return false;
        await t
          .update(promotions)
          .set({ clickCount: sql`${promotions.clickCount} + 1` })
          .where(eq(promotions.id, click.promotionId));
        return true;
      });
    },

    /** Seed only: no counter updates (follow with recountPromotionClicks). */
    async insertMany(values: NewClickEventRow[], tx: DbOrTx = db): Promise<void> {
      for (const part of chunk(values, 1000)) await tx.insert(clickEvents).values(part);
    },

    /** Clicks per platform for each promotion (Promotion.clicksByPlatform). */
    async byPlatform(
      promotionIds: string[],
      tx: DbOrTx = db,
    ): Promise<Map<string, Record<ClickPlatform, number>>> {
      const out = new Map<string, Record<ClickPlatform, number>>(
        promotionIds.map((id) => [id, emptyPlatforms()]),
      );
      if (promotionIds.length === 0) return out;
      const rows = await tx
        .select({
          promotionId: clickEvents.promotionId,
          platform: clickEvents.platform,
          n: count(),
        })
        .from(clickEvents)
        .where(inArray(clickEvents.promotionId, promotionIds))
        .groupBy(clickEvents.promotionId, clickEvents.platform);
      for (const row of rows) {
        const entry = out.get(row.promotionId);
        if (entry) entry[row.platform] = row.n;
      }
      return out;
    },

    /** Distinct visitor hashes (unique visitors per day, since the hash includes the day). */
    async uniqueVisitors(promotionId: string, tx: DbOrTx = db): Promise<number> {
      const [row] = await tx
        .select({ n: countDistinct(clickEvents.visitorHash) })
        .from(clickEvents)
        .where(eq(clickEvents.promotionId, promotionId));
      return row?.n ?? 0;
    },

    /** Retention (05 §8: 180 days). click_count keeps the lifetime total. */
    async purgeOlderThan(before: Date, tx: DbOrTx = db): Promise<number> {
      const rows = await tx
        .delete(clickEvents)
        .where(lt(clickEvents.createdAt, before))
        .returning({ id: clickEvents.id });
      return rows.length;
    },

    /** Clicks in [from, to) for one promotion (optional analytics). */
    async countBetween(
      promotionId: string,
      from: Date,
      to: Date,
      tx: DbOrTx = db,
    ): Promise<number> {
      const [row] = await tx
        .select({ n: count() })
        .from(clickEvents)
        .where(
          and(
            eq(clickEvents.promotionId, promotionId),
            sql`${clickEvents.createdAt} >= ${from.toISOString()}::timestamptz`,
            lt(clickEvents.createdAt, to),
          ),
        );
      return row?.n ?? 0;
    },
  };
}

export type ClicksRepo = ReturnType<typeof createClicksRepo>;
