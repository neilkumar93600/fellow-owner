import {
  type PostType,
  PROMOTION_STATES,
  type PromotionState,
  type Tint,
} from '@fellow-owners/shared';
import { and, count, desc, eq, inArray, isNotNull, isNull, sql } from 'drizzle-orm';
import { chunk, type Db, type DbOrTx } from '../db/client.js';
import { communities } from '../db/schema/communities.js';
import { posts } from '../db/schema/posts.js';
import { type NewPromotionRow, type PromotionRow, promotions } from '../db/schema/promotions.js';
import { spaces } from '../db/schema/spaces.js';
import { encodeTimeCursor, type PageResult, type TimeCursor, toPage } from '../lib/pagination.js';

/** Draft until published; live while published; unpublished after unpublish. */
export function promotionState(
  row: Pick<PromotionRow, 'publishedAt' | 'unpublishedAt'>,
): PromotionState {
  if (!row.publishedAt) return 'draft';
  return row.unpublishedAt ? 'unpublished' : 'live';
}

export type PromotionDraftUpdate = Partial<
  Pick<NewPromotionRow, 'headline' | 'drafts' | 'draftErrors'>
>;

/** A live promotion with what the bio page's FeaturedProject needs. */
export interface LivePromotionRow {
  promotion: PromotionRow;
  post: { id: string; title: string; body: string; type: PostType };
  community: { name: string; tint: Tint };
}

const stateSql = sql<PromotionState>`(case when ${promotions.publishedAt} is null then 'draft' when ${promotions.unpublishedAt} is not null then 'unpublished' else 'live' end)`;

export function createPromotionsRepo(db: Db) {
  return {
    async findById(spaceId: string, id: string, tx: DbOrTx = db): Promise<PromotionRow | null> {
      const [row] = await tx
        .select()
        .from(promotions)
        .where(and(eq(promotions.spaceId, spaceId), eq(promotions.id, id)))
        .limit(1);
      return row ?? null;
    },

    async findByPostId(
      spaceId: string,
      postId: string,
      tx: DbOrTx = db,
    ): Promise<PromotionRow | null> {
      const [row] = await tx
        .select()
        .from(promotions)
        .where(and(eq(promotions.spaceId, spaceId), eq(promotions.postId, postId)))
        .limit(1);
      return row ?? null;
    },

    /** Global lookup for GET /r/:code, with the space handle for the redirect. */
    async findByShortCode(
      code: string,
      tx: DbOrTx = db,
    ): Promise<{ promotion: PromotionRow; handle: string } | null> {
      const [row] = await tx
        .select({ promotion: promotions, handle: spaces.handle })
        .from(promotions)
        .innerJoin(spaces, eq(spaces.id, promotions.spaceId))
        .where(eq(promotions.shortCode, code))
        .limit(1);
      return row ?? null;
    },

    /** Showcase lookup (any state; the service decides what an unpublished one shows). */
    async findBySlug(spaceId: string, slug: string, tx: DbOrTx = db): Promise<PromotionRow | null> {
      const [row] = await tx
        .select()
        .from(promotions)
        .where(and(eq(promotions.spaceId, spaceId), eq(promotions.showcaseSlug, slug)))
        .limit(1);
      return row ?? null;
    },

    /**
     * One promotion per post: inserts the draft, or returns the existing row with created=false
     * (POST /api/studio/promotions answers 201 or 200 accordingly).
     */
    async insertDraft(
      values: NewPromotionRow,
      tx: DbOrTx = db,
    ): Promise<{ row: PromotionRow; created: boolean }> {
      const [inserted] = await tx
        .insert(promotions)
        .values(values)
        .onConflictDoNothing({ target: promotions.postId })
        .returning();
      if (inserted) return { row: inserted, created: true };
      const [existing] = await tx
        .select()
        .from(promotions)
        .where(eq(promotions.postId, values.postId))
        .limit(1);
      if (!existing) throw new Error('promotion insert conflicted but no row was found');
      return { row: existing, created: false };
    },

    /** Seed only. */
    async insertMany(values: NewPromotionRow[], tx: DbOrTx = db): Promise<PromotionRow[]> {
      const out: PromotionRow[] = [];
      for (const part of chunk(values, 200)) {
        out.push(...(await tx.insert(promotions).values(part).returning()));
      }
      return out;
    },

    /** Save drafts/headline, or record draftErrors after an AI run. */
    async update(
      spaceId: string,
      id: string,
      patch: PromotionDraftUpdate,
      tx: DbOrTx = db,
    ): Promise<PromotionRow | null> {
      const [row] = await tx
        .update(promotions)
        .set({ ...patch, updatedAt: new Date() })
        .where(and(eq(promotions.spaceId, spaceId), eq(promotions.id, id)))
        .returning();
      return row ?? null;
    },

    /**
     * Publish: published_at = now, unpublished_at cleared. The slug and code are only set the
     * first time (a republished promotion keeps its showcase URL and short link).
     */
    async publish(
      spaceId: string,
      id: string,
      { showcaseSlug, shortCode }: { showcaseSlug: string; shortCode: string },
      tx: DbOrTx = db,
    ): Promise<PromotionRow | null> {
      const now = new Date();
      const [row] = await tx
        .update(promotions)
        .set({
          publishedAt: now,
          unpublishedAt: null,
          showcaseSlug: sql`coalesce(${promotions.showcaseSlug}, ${showcaseSlug})`,
          shortCode: sql`coalesce(${promotions.shortCode}, ${shortCode})`,
          updatedAt: now,
        })
        .where(and(eq(promotions.spaceId, spaceId), eq(promotions.id, id)))
        .returning();
      return row ?? null;
    },

    async unpublish(spaceId: string, id: string, tx: DbOrTx = db): Promise<PromotionRow | null> {
      const now = new Date();
      const [row] = await tx
        .update(promotions)
        .set({ unpublishedAt: now, updatedAt: now })
        .where(
          and(
            eq(promotions.spaceId, spaceId),
            eq(promotions.id, id),
            isNotNull(promotions.publishedAt),
          ),
        )
        .returning();
      return row ?? null;
    },

    async listSlugs(spaceId: string, tx: DbOrTx = db): Promise<Set<string>> {
      const rows = await tx
        .select({ slug: promotions.showcaseSlug })
        .from(promotions)
        .where(and(eq(promotions.spaceId, spaceId), isNotNull(promotions.showcaseSlug)));
      return new Set(rows.flatMap((row) => (row.slug ? [row.slug] : [])));
    },

    async slugTaken(spaceId: string, slug: string, tx: DbOrTx = db): Promise<boolean> {
      const [row] = await tx
        .select({ id: promotions.id })
        .from(promotions)
        .where(and(eq(promotions.spaceId, spaceId), eq(promotions.showcaseSlug, slug)))
        .limit(1);
      return Boolean(row);
    },

    async shortCodeTaken(code: string, tx: DbOrTx = db): Promise<boolean> {
      const [row] = await tx
        .select({ id: promotions.id })
        .from(promotions)
        .where(eq(promotions.shortCode, code))
        .limit(1);
      return Boolean(row);
    },

    /** Studio list: newest first with a (created_at, id) cursor. */
    async list(
      spaceId: string,
      { cursor, limit }: { cursor: TimeCursor | null; limit: number },
      tx: DbOrTx = db,
    ): Promise<PageResult<PromotionRow>> {
      const rows = await tx
        .select()
        .from(promotions)
        .where(
          and(
            eq(promotions.spaceId, spaceId),
            cursor
              ? sql`(${promotions.createdAt}, ${promotions.id}) < (${cursor.createdAt.toISOString()}::timestamptz, ${cursor.id}::uuid)`
              : undefined,
          ),
        )
        .orderBy(desc(promotions.createdAt), desc(promotions.id))
        .limit(limit + 1);
      return toPage(rows, limit, encodeTimeCursor);
    },

    /** Count per state and the sum of click_count (PromotionsPage). */
    async stateCounts(
      spaceId: string,
      tx: DbOrTx = db,
    ): Promise<{ counts: Record<PromotionState, number>; totalClicks: number }> {
      const rows = await tx
        .select({
          state: stateSql,
          n: count(),
          clicks: sql<number>`coalesce(sum(${promotions.clickCount}), 0)`.mapWith(Number),
        })
        .from(promotions)
        .where(eq(promotions.spaceId, spaceId))
        .groupBy(stateSql);
      const counts = Object.fromEntries(PROMOTION_STATES.map((s) => [s, 0])) as Record<
        PromotionState,
        number
      >;
      let totalClicks = 0;
      for (const row of rows) {
        counts[row.state] = row.n;
        totalClicks += row.clicks;
      }
      return { counts, totalClicks };
    },

    /** Live promotions, newest published first (bio page "Featured", max 6 by default). */
    async listLive(spaceId: string, limit = 6, tx: DbOrTx = db): Promise<LivePromotionRow[]> {
      return tx
        .select({
          promotion: promotions,
          post: { id: posts.id, title: posts.title, body: posts.body, type: posts.type },
          community: { name: communities.name, tint: communities.tint },
        })
        .from(promotions)
        .innerJoin(posts, eq(posts.id, promotions.postId))
        .innerJoin(communities, eq(communities.id, posts.communityId))
        .where(
          and(
            eq(promotions.spaceId, spaceId),
            isNotNull(promotions.publishedAt),
            isNull(promotions.unpublishedAt),
            isNull(posts.deletedAt),
            isNull(posts.hiddenAt),
          ),
        )
        .orderBy(desc(promotions.publishedAt))
        .limit(limit);
    },

    /** Promotion id and state per post (IdeaItem.promotion). */
    async byPostIds(
      spaceId: string,
      postIds: string[],
      tx: DbOrTx = db,
    ): Promise<Map<string, { id: string; state: PromotionState }>> {
      const out = new Map<string, { id: string; state: PromotionState }>();
      if (postIds.length === 0) return out;
      const rows = await tx
        .select({ postId: promotions.postId, id: promotions.id, state: stateSql })
        .from(promotions)
        .where(and(eq(promotions.spaceId, spaceId), inArray(promotions.postId, postIds)));
      for (const row of rows) out.set(row.postId, { id: row.id, state: row.state });
      return out;
    },

    /** click_count + 1 (clicks.record does this inside its transaction). */
    async incrementClicks(id: string, tx: DbOrTx = db): Promise<void> {
      await tx
        .update(promotions)
        .set({ clickCount: sql`${promotions.clickCount} + 1` })
        .where(eq(promotions.id, id));
    },
  };
}

export type PromotionsRepo = ReturnType<typeof createPromotionsRepo>;
