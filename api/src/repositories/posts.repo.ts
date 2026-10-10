import {
  type AnalysisStatus,
  LIMITS,
  type LinkItem,
  type PitchType,
  POST_TYPES,
  type PostType,
  type TasteProfile,
} from '@fellow-owners/shared';
import { and, asc, count, desc, eq, gte, inArray, isNotNull, isNull, lt, sql } from 'drizzle-orm';
import { chunk, type Db, type DbOrTx, likePattern } from '../db/client.js';
import { communities } from '../db/schema/communities.js';
import { asks } from '../db/schema/later.js';
import { type NewPostRow, type PostRow, posts } from '../db/schema/posts.js';
import { spaces } from '../db/schema/spaces.js';
import { encodeTimeCursor, type PageResult, type TimeCursor, toPage } from '../lib/pagination.js';

// ---------------------------------------------------------------- analysis types (posts + inbound)

/** What the AI writes back for one item (posts and inbound share the AI fields). */
export interface AnalysisFields {
  summary: string;
  category: string;
  fitScore: number;
  fitReason: string;
  tags: string[];
  skills: string[];
  isSpam: boolean;
  /** The taste version the score was computed with (spaces.taste_version at analysis time). */
  scoredTasteVersion: number;
  /** New embedding; omit to keep the stored one. */
  embedding?: number[] | null;
}

/** Everything analyzeItem needs about one item, loaded in one query. */
export interface AnalysisSubject {
  kind: 'post' | 'inbound';
  id: string;
  spaceId: string;
  type: PostType | PitchType;
  title: string;
  body: string;
  links: LinkItem[];
  contentHash: string;
  analysisStatus: AnalysisStatus;
  analysisAttempts: number;
  scoredTasteVersion: number | null;
  hasEmbedding: boolean;
  /** Posts only. */
  communityName: string | null;
  tasteProfile: TasteProfile;
  tasteVersion: number;
  /** spaces.display_name */
  creatorName: string;
  /** Soft-deleted posts are skipped (always false for inbound). */
  deleted: boolean;
}

export interface MarkFailedResult {
  attempts: number;
  status: AnalysisStatus;
}

/** Seconds a sweep/analysis claim keeps other sweeps away from an item. */
export const ANALYSIS_LEASE_SECONDS = 300;

// ---------------------------------------------------------------- posts-specific types

export type PostContentUpdate = Partial<
  Pick<NewPostRow, 'title' | 'body' | 'rolesNeeded' | 'links' | 'status' | 'contentHash'>
>;

export interface PostCounts {
  useCount: number;
  buildCount: number;
  commentCount: number;
}

export interface FeedFilter {
  spaceId: string;
  communityId: string;
  type?: PostType | undefined;
  cursor: TimeCursor | null;
  limit: number;
}

export interface RankFilter {
  communityId?: string | undefined;
  type?: PostType | undefined;
  /** ILIKE over title, body and AI summary, or an exact AI tag. */
  q?: string | undefined;
  /** Hidden posts are part of the owner's Ideas view (default true). */
  includeHidden?: boolean;
  /** Most recent N candidates to rank (default 2000). */
  max?: number;
}

/** The columns the idea score needs (lib/ranking.ts ideaScore). */
export interface RankInput {
  id: string;
  communityId: string;
  aiFitScore: number | null;
  analysisStatus: AnalysisStatus;
  useCount: number;
  buildCount: number;
  commentCount: number;
  createdAt: Date;
}

export interface WeeklyCount {
  weekStart: Date;
  count: number;
}

const notDeleted = isNull(posts.deletedAt);
const visible = and(isNull(posts.deletedAt), isNull(posts.hiddenAt));
const leaseExpired = sql`(${posts.analysisClaimedAt} is null or ${posts.analysisClaimedAt} < now() - make_interval(secs => ${ANALYSIS_LEASE_SECONDS}))`;

function searchCondition(q: string | undefined) {
  const term = q?.trim();
  if (!term) return undefined;
  const pattern = likePattern(term);
  return sql`(${posts.title} ilike ${pattern} or ${posts.body} ilike ${pattern} or ${posts.aiSummary} ilike ${pattern} or ${posts.aiTags} @> array[${term.toLowerCase()}]::text[])`;
}

export function createPostsRepo(db: Db) {
  return {
    /** Any space: /api/posts/:id resolves the space from the post, then the membership. */
    async findById(id: string, tx: DbOrTx = db): Promise<PostRow | null> {
      const [row] = await tx.select().from(posts).where(eq(posts.id, id)).limit(1);
      return row ?? null;
    },

    async findInSpace(spaceId: string, id: string, tx: DbOrTx = db): Promise<PostRow | null> {
      const [row] = await tx
        .select()
        .from(posts)
        .where(and(eq(posts.spaceId, spaceId), eq(posts.id, id)))
        .limit(1);
      return row ?? null;
    },

    async findManyByIds(spaceId: string, ids: string[], tx: DbOrTx = db): Promise<PostRow[]> {
      if (ids.length === 0) return [];
      return tx
        .select()
        .from(posts)
        .where(and(eq(posts.spaceId, spaceId), inArray(posts.id, ids)));
    },

    /**
     * Locks the post row (SELECT ... FOR UPDATE) for the rest of the transaction `tx`, e.g. so two
     * team decisions on the same project cannot both fill one role. Returns the locked row.
     */
    async lockForUpdate(spaceId: string, id: string, tx: DbOrTx): Promise<PostRow | null> {
      const [row] = await tx
        .select()
        .from(posts)
        .where(and(eq(posts.spaceId, spaceId), eq(posts.id, id)))
        .limit(1)
        .for('update');
      return row ?? null;
    },

    /** Insert with analysis pending; the caller computes content_hash (lib/hash.ts). */
    async insert(values: NewPostRow, tx: DbOrTx = db): Promise<PostRow> {
      const [row] = await tx.insert(posts).values(values).returning();
      if (!row) throw new Error('insert into posts returned no row');
      return row;
    },

    async insertMany(values: NewPostRow[], tx: DbOrTx = db): Promise<PostRow[]> {
      const out: PostRow[] = [];
      for (const part of chunk(values, 200)) {
        out.push(...(await tx.insert(posts).values(part).returning()));
      }
      return out;
    },

    async update(
      spaceId: string,
      id: string,
      patch: PostContentUpdate,
      tx: DbOrTx = db,
    ): Promise<PostRow | null> {
      const [row] = await tx
        .update(posts)
        .set({ ...patch, updatedAt: new Date() })
        .where(and(eq(posts.spaceId, spaceId), eq(posts.id, id)))
        .returning();
      return row ?? null;
    },

    /**
     * Back to `pending` with attempts 0 (content edit or owner rescore). Pass clearEmbedding when
     * the content changed so the analyzer embeds again. AI fields stay until the new result lands.
     */
    async resetAnalysis(
      spaceId: string,
      id: string,
      { clearEmbedding = false }: { clearEmbedding?: boolean } = {},
      tx: DbOrTx = db,
    ): Promise<PostRow | null> {
      const [row] = await tx
        .update(posts)
        .set({
          analysisStatus: 'pending',
          analysisAttempts: 0,
          analysisError: null,
          analysisClaimedAt: null,
          ...(clearEmbedding ? { embedding: null } : {}),
        })
        .where(and(eq(posts.spaceId, spaceId), eq(posts.id, id)))
        .returning();
      return row ?? null;
    },

    /** Author soft delete. False when missing or already deleted. */
    async softDelete(spaceId: string, id: string, tx: DbOrTx = db): Promise<boolean> {
      const rows = await tx
        .update(posts)
        .set({ deletedAt: new Date() })
        .where(and(eq(posts.spaceId, spaceId), eq(posts.id, id), isNull(posts.deletedAt)))
        .returning({ id: posts.id });
      return rows.length > 0;
    },

    /** Owner hide/unhide (hidden_at). */
    async setHidden(
      spaceId: string,
      id: string,
      hidden: boolean,
      tx: DbOrTx = db,
    ): Promise<PostRow | null> {
      const [row] = await tx
        .update(posts)
        .set({ hiddenAt: hidden ? new Date() : null })
        .where(and(eq(posts.spaceId, spaceId), eq(posts.id, id)))
        .returning();
      return row ?? null;
    },

    /** featured_at on publish (true) / unpublish (false). */
    async setFeatured(
      spaceId: string,
      id: string,
      featured: boolean,
      tx: DbOrTx = db,
    ): Promise<void> {
      await tx
        .update(posts)
        .set({ featuredAt: featured ? new Date() : null })
        .where(and(eq(posts.spaceId, spaceId), eq(posts.id, id)));
    },

    /**
     * Owner love/unlove (loved_at). Only flips when the state differs, so `changed` tells the
     * caller whether to notify. Null when the post is not in the space.
     */
    async setLoved(
      spaceId: string,
      id: string,
      loved: boolean,
      tx: DbOrTx = db,
    ): Promise<{ lovedAt: Date | null; changed: boolean } | null> {
      const [row] = await tx
        .update(posts)
        .set({ lovedAt: loved ? new Date() : null })
        .where(
          and(
            eq(posts.spaceId, spaceId),
            eq(posts.id, id),
            loved ? isNull(posts.lovedAt) : isNotNull(posts.lovedAt),
          ),
        )
        .returning({ lovedAt: posts.lovedAt });
      if (row) return { lovedAt: row.lovedAt, changed: true };
      const [current] = await tx
        .select({ lovedAt: posts.lovedAt })
        .from(posts)
        .where(and(eq(posts.spaceId, spaceId), eq(posts.id, id)))
        .limit(1);
      return current ? { lovedAt: current.lovedAt, changed: false } : null;
    },

    /**
     * Challenge (ask) title and status for posts entered into one (PostCard.challenge). An open
     * ask past its due date reads as closed (challenges.service closes it on its next read).
     */
    async challengeRefs(
      askIds: string[],
      tx: DbOrTx = db,
    ): Promise<Map<string, { id: string; title: string; status: 'open' | 'closed' }>> {
      if (askIds.length === 0) return new Map();
      const rows = await tx
        .select({ id: asks.id, title: asks.title, status: asks.status, dueAt: asks.dueAt })
        .from(asks)
        .where(inArray(asks.id, askIds));
      const now = Date.now();
      return new Map(
        rows.map(({ dueAt, ...row }) => [
          row.id,
          {
            ...row,
            status:
              row.status === 'open' && dueAt && dueAt.getTime() <= now ? 'closed' : row.status,
          },
        ]),
      );
    },

    /** Denormalized counters += delta (never below 0). Call in the same transaction as the write. */
    async adjustCounts(
      postId: string,
      delta: { use?: number; build?: number; comment?: number },
      tx: DbOrTx = db,
    ): Promise<PostCounts | null> {
      const [row] = await tx
        .update(posts)
        .set({
          useCount: sql`greatest(0, ${posts.useCount} + ${delta.use ?? 0})`,
          buildCount: sql`greatest(0, ${posts.buildCount} + ${delta.build ?? 0})`,
          commentCount: sql`greatest(0, ${posts.commentCount} + ${delta.comment ?? 0})`,
        })
        .where(eq(posts.id, postId))
        .returning({
          useCount: posts.useCount,
          buildCount: posts.buildCount,
          commentCount: posts.commentCount,
        });
      return row ?? null;
    },

    /** Recomputes use/build/comment counts from signals and comments (seed, repair). */
    async recountCounters(spaceId: string, tx: DbOrTx = db): Promise<void> {
      await tx.execute(sql`
        update posts p set
          use_count = (select count(*)::int from signals s where s.post_id = p.id and s.kind = 'use'),
          build_count = (select count(*)::int from signals s where s.post_id = p.id and s.kind = 'build'),
          comment_count = (select count(*)::int from comments c where c.post_id = p.id and c.deleted_at is null)
        where p.space_id = ${spaceId}
      `);
    },

    /** Community feed: newest first, not hidden or deleted, optional type, (created_at, id) cursor. */
    async listFeed(filter: FeedFilter, tx: DbOrTx = db): Promise<PageResult<PostRow>> {
      const { spaceId, communityId, type, cursor, limit } = filter;
      const rows = await tx
        .select()
        .from(posts)
        .where(
          and(
            eq(posts.spaceId, spaceId),
            eq(posts.communityId, communityId),
            visible,
            type ? eq(posts.type, type) : undefined,
            cursor
              ? sql`(${posts.createdAt}, ${posts.id}) < (${cursor.createdAt.toISOString()}::timestamptz, ${cursor.id}::uuid)`
              : undefined,
          ),
        )
        .orderBy(desc(posts.createdAt), desc(posts.id))
        .limit(limit + 1);
      return toPage(rows, limit, encodeTimeCursor);
    },

    /** Visible posts per type in one community (feed tab counts). */
    async countByType(
      spaceId: string,
      communityId: string,
      tx: DbOrTx = db,
    ): Promise<Record<PostType, number>> {
      const rows = await tx
        .select({ type: posts.type, n: count() })
        .from(posts)
        .where(and(eq(posts.spaceId, spaceId), eq(posts.communityId, communityId), visible))
        .groupBy(posts.type);
      const counts = Object.fromEntries(POST_TYPES.map((t) => [t, 0])) as Record<PostType, number>;
      for (const row of rows) counts[row.type] = row.n;
      return counts;
    },

    /** First titles for the locked (non-member) feed preview. */
    async previewTitles(
      spaceId: string,
      communityId: string,
      limit = 3,
      tx: DbOrTx = db,
    ): Promise<Array<{ id: string; type: PostType; title: string }>> {
      return tx
        .select({ id: posts.id, type: posts.type, title: posts.title })
        .from(posts)
        .where(and(eq(posts.spaceId, spaceId), eq(posts.communityId, communityId), visible))
        .orderBy(desc(posts.createdAt), desc(posts.id))
        .limit(limit);
    },

    /** The author's own posts (not deleted; hidden included), newest first. */
    async listByAuthor(
      spaceId: string,
      membershipId: string,
      { limit = 100 }: { limit?: number } = {},
      tx: DbOrTx = db,
    ): Promise<PostRow[]> {
      return tx
        .select()
        .from(posts)
        .where(
          and(eq(posts.spaceId, spaceId), eq(posts.authorMembershipId, membershipId), notDeleted),
        )
        .orderBy(desc(posts.createdAt), desc(posts.id))
        .limit(limit);
    },

    /** Daily cap: posts created by the member since `since` (deleted ones count too). */
    async countByAuthorSince(
      spaceId: string,
      membershipId: string,
      since: Date,
      tx: DbOrTx = db,
    ): Promise<number> {
      const [row] = await tx
        .select({ n: count() })
        .from(posts)
        .where(
          and(
            eq(posts.spaceId, spaceId),
            eq(posts.authorMembershipId, membershipId),
            gte(posts.createdAt, since),
          ),
        );
      return row?.n ?? 0;
    },

    /** Ranking inputs for the Ideas view (most recent `max`, not deleted). Rank with lib/ranking. */
    async listRankInputs(
      spaceId: string,
      filter: RankFilter = {},
      tx: DbOrTx = db,
    ): Promise<RankInput[]> {
      const { communityId, type, q, includeHidden = true, max = 2000 } = filter;
      return tx
        .select({
          id: posts.id,
          communityId: posts.communityId,
          aiFitScore: posts.aiFitScore,
          analysisStatus: posts.analysisStatus,
          useCount: posts.useCount,
          buildCount: posts.buildCount,
          commentCount: posts.commentCount,
          createdAt: posts.createdAt,
        })
        .from(posts)
        .where(
          and(
            eq(posts.spaceId, spaceId),
            notDeleted,
            includeHidden ? undefined : isNull(posts.hiddenAt),
            communityId ? eq(posts.communityId, communityId) : undefined,
            type ? eq(posts.type, type) : undefined,
            searchCondition(q),
          ),
        )
        .orderBy(desc(posts.createdAt), desc(posts.id))
        .limit(max);
    },

    /** Not-deleted posts per community with the same type/q filters (Ideas count chips). */
    async countByCommunity(
      spaceId: string,
      { type, q, includeHidden = true }: Omit<RankFilter, 'communityId' | 'max'> = {},
      tx: DbOrTx = db,
    ): Promise<Array<{ communityId: string; count: number }>> {
      const rows = await tx
        .select({ communityId: posts.communityId, n: count() })
        .from(posts)
        .where(
          and(
            eq(posts.spaceId, spaceId),
            notDeleted,
            includeHidden ? undefined : isNull(posts.hiddenAt),
            type ? eq(posts.type, type) : undefined,
            searchCondition(q),
          ),
        )
        .groupBy(posts.communityId);
      return rows.map((row) => ({ communityId: row.communityId, count: row.n }));
    },

    /** Posts created in [from, to), not deleted (overview metrics). Bounds optional. */
    async countCreated(
      spaceId: string,
      { from, to }: { from?: Date; to?: Date } = {},
      tx: DbOrTx = db,
    ): Promise<number> {
      const [row] = await tx
        .select({ n: count() })
        .from(posts)
        .where(
          and(
            eq(posts.spaceId, spaceId),
            notDeleted,
            from ? gte(posts.createdAt, from) : undefined,
            to ? lt(posts.createdAt, to) : undefined,
          ),
        );
      return row?.n ?? 0;
    },

    /** Posts per ISO week (Monday 00:00 UTC) since `from`; weeks with none are absent. */
    async weeklyCreated(spaceId: string, from: Date, tx: DbOrTx = db): Promise<WeeklyCount[]> {
      const week = sql<string>`to_char(date_trunc('week', ${posts.createdAt} at time zone 'UTC'), 'YYYY-MM-DD')`;
      const rows = await tx
        .select({ week, n: count() })
        .from(posts)
        .where(and(eq(posts.spaceId, spaceId), notDeleted, gte(posts.createdAt, from)))
        .groupBy(week)
        .orderBy(week);
      return rows.map((row) => ({
        weekStart: new Date(`${row.week}T00:00:00.000Z`),
        count: row.n,
      }));
    },

    /** Live (featured) post ids of the space. */
    async listFeaturedIds(spaceId: string, tx: DbOrTx = db): Promise<string[]> {
      const rows = await tx
        .select({ id: posts.id })
        .from(posts)
        .where(and(eq(posts.spaceId, spaceId), isNotNull(posts.featuredAt), notDeleted));
      return rows.map((row) => row.id);
    },

    // ------------------------------------------------------------ analysis

    /** Items waiting for analysis (pending, not deleted). */
    async countPendingAnalysis(spaceId: string, tx: DbOrTx = db): Promise<number> {
      const [row] = await tx
        .select({ n: count() })
        .from(posts)
        .where(and(eq(posts.spaceId, spaceId), eq(posts.analysisStatus, 'pending'), notDeleted));
      return row?.n ?? 0;
    },

    async getForAnalysis(id: string, tx: DbOrTx = db): Promise<AnalysisSubject | null> {
      const [row] = await tx
        .select({
          id: posts.id,
          spaceId: posts.spaceId,
          type: posts.type,
          title: posts.title,
          body: posts.body,
          links: posts.links,
          contentHash: posts.contentHash,
          analysisStatus: posts.analysisStatus,
          analysisAttempts: posts.analysisAttempts,
          scoredTasteVersion: posts.scoredTasteVersion,
          hasEmbedding: sql<boolean>`${posts.embedding} is not null`,
          communityName: communities.name,
          tasteProfile: spaces.tasteProfile,
          tasteVersion: spaces.tasteVersion,
          creatorName: spaces.displayName,
          deletedAt: posts.deletedAt,
        })
        .from(posts)
        .innerJoin(spaces, eq(spaces.id, posts.spaceId))
        .innerJoin(communities, eq(communities.id, posts.communityId))
        .where(eq(posts.id, id))
        .limit(1);
      if (!row) return null;
      const { deletedAt, ...rest } = row;
      return { kind: 'post', ...rest, deleted: deletedAt !== null };
    },

    /**
     * Writes a triage result: AI fields, `done`, attempts kept, error/lease cleared.
     * With expectedContentHash, nothing is written if the content changed meanwhile (returns false).
     */
    async saveAnalysis(
      id: string,
      fields: AnalysisFields,
      { expectedContentHash }: { expectedContentHash?: string } = {},
      tx: DbOrTx = db,
    ): Promise<boolean> {
      const rows = await tx
        .update(posts)
        .set({
          analysisStatus: 'done',
          analysisError: null,
          analysisClaimedAt: null,
          scoredTasteVersion: fields.scoredTasteVersion,
          aiSummary: fields.summary.slice(0, LIMITS.ai.summaryMax),
          aiCategory: fields.category,
          aiFitScore: Math.round(Math.min(100, Math.max(0, fields.fitScore))),
          aiFitReason: fields.fitReason.slice(0, LIMITS.ai.fitReasonMax),
          aiTags: fields.tags.slice(0, LIMITS.ai.tagsMax),
          aiSkills: fields.skills.slice(0, LIMITS.ai.skillsMax).map((s) => s.toLowerCase()),
          aiIsSpam: fields.isSpam,
          ...(fields.embedding !== undefined ? { embedding: fields.embedding } : {}),
        })
        .where(
          and(
            eq(posts.id, id),
            expectedContentHash ? eq(posts.contentHash, expectedContentHash) : undefined,
          ),
        )
        .returning({ id: posts.id });
      return rows.length > 0;
    },

    /** attempts + 1; `failed` once attempts reach LIMITS.ai.maxAttempts (3), else back to pending. */
    async markFailed(id: string, error: string, tx: DbOrTx = db): Promise<MarkFailedResult | null> {
      const [row] = await tx
        .update(posts)
        .set({
          analysisAttempts: sql`${posts.analysisAttempts} + 1`,
          analysisStatus: sql`case when ${posts.analysisAttempts} + 1 >= ${LIMITS.ai.maxAttempts} then 'failed'::analysis_status else 'pending'::analysis_status end`,
          analysisError: error.slice(0, 1000),
          analysisClaimedAt: null,
        })
        .where(eq(posts.id, id))
        .returning({ attempts: posts.analysisAttempts, status: posts.analysisStatus });
      return row ?? null;
    },

    /**
     * Claims up to `limit` pending items of the space for analysis: FOR UPDATE SKIP LOCKED plus a
     * lease (analysis_claimed_at) so concurrent sweeps never take the same item. Oldest first.
     */
    async claimPending(spaceId: string, limit: number, tx: DbOrTx = db): Promise<string[]> {
      const candidates = tx
        .select({ id: posts.id })
        .from(posts)
        .where(
          and(
            eq(posts.spaceId, spaceId),
            eq(posts.analysisStatus, 'pending'),
            notDeleted,
            leaseExpired,
          ),
        )
        .orderBy(asc(posts.createdAt))
        .limit(limit)
        .for('update', { skipLocked: true });
      const rows = await tx
        .update(posts)
        .set({ analysisClaimedAt: sql`now()` })
        .where(inArray(posts.id, candidates))
        .returning({ id: posts.id });
      return rows.map((row) => row.id);
    },

    /** Claims one item (direct analysis after insert/edit). False when another worker holds it. */
    async claimItem(id: string, tx: DbOrTx = db): Promise<boolean> {
      const rows = await tx
        .update(posts)
        .set({ analysisClaimedAt: sql`now()` })
        .where(and(eq(posts.id, id), leaseExpired))
        .returning({ id: posts.id });
      return rows.length > 0;
    },

    /** Gives an item back without consuming an attempt (budget reached, AI disabled). */
    async releaseClaim(id: string, tx: DbOrTx = db): Promise<void> {
      await tx.update(posts).set({ analysisClaimedAt: null }).where(eq(posts.id, id));
    },

    /** Pending items not currently claimed (SweepResponse.remaining). */
    async remainingPending(spaceId: string, tx: DbOrTx = db): Promise<number> {
      const [row] = await tx
        .select({ n: count() })
        .from(posts)
        .where(
          and(
            eq(posts.spaceId, spaceId),
            eq(posts.analysisStatus, 'pending'),
            notDeleted,
            leaseExpired,
          ),
        );
      return row?.n ?? 0;
    },

    /** Backfill (pnpm db:embed): analyzed posts without an embedding. */
    async listMissingEmbeddings(
      limit: number,
      tx: DbOrTx = db,
    ): Promise<Array<{ id: string; spaceId: string; title: string; body: string }>> {
      return tx
        .select({ id: posts.id, spaceId: posts.spaceId, title: posts.title, body: posts.body })
        .from(posts)
        .where(and(isNull(posts.embedding), notDeleted))
        .orderBy(asc(posts.createdAt))
        .limit(limit);
    },

    async setEmbedding(id: string, embedding: number[], tx: DbOrTx = db): Promise<void> {
      await tx.update(posts).set({ embedding }).where(eq(posts.id, id));
    },

    // ------------------------------------------------------------ retention

    /** Hard-deletes posts soft-deleted before `before` (05 §8: 30 days). */
    async purgeSoftDeleted(before: Date, tx: DbOrTx = db): Promise<number> {
      const rows = await tx
        .delete(posts)
        .where(and(isNotNull(posts.deletedAt), lt(posts.deletedAt, before)))
        .returning({ id: posts.id });
      return rows.length;
    },
  };
}

export type PostsRepo = ReturnType<typeof createPostsRepo>;
