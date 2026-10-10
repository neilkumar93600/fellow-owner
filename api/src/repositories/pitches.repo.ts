import {
  INBOX_TAB_PITCH_TYPE,
  INBOX_TABS,
  type InboxSort,
  type InboxTab,
  LIMITS,
  type PitchStatus,
  type PitchType,
  RANKING,
} from '@fellow-owners/shared';
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  lt,
  ne,
  type SQL,
  sql,
} from 'drizzle-orm';
import { chunk, type Db, type DbOrTx, likePattern } from '../db/client.js';
import { user } from '../db/schema/auth.js';
import { type InboundRow, inbound, type NewInboundRow } from '../db/schema/inbound.js';
import { memberships } from '../db/schema/memberships.js';
import { questionGroups } from '../db/schema/question-groups.js';
import { spaces } from '../db/schema/spaces.js';
import {
  decodeScoreCursor,
  decodeTimeCursor,
  encodeScoreCursor,
  encodeTimeCursor,
  type PageResult,
  toPage,
} from '../lib/pagination.js';
import {
  ANALYSIS_LEASE_SECONDS,
  type AnalysisFields,
  type AnalysisSubject,
  type MarkFailedResult,
} from './posts.repo.js';

/** An inbound row with the sender's MemberRef fields (never the email). */
export interface InboxRow extends InboundRow {
  senderName: string;
  senderHeadline: string | null;
  senderImage: string | null;
  /** Inbox "Fit" sort value: ai_fit_score when done, else 50. */
  fitSortValue: number;
}

export interface InboxFilter {
  tab: InboxTab;
  sort: InboxSort;
  status?: PitchStatus | undefined;
  /** ILIKE over subject, body and sender name. */
  q?: string | undefined;
  cursor?: string | undefined;
  limit: number;
}

export type InboxMixKey = PitchType | 'spam';

/** The type a pitch is filed under: the AI category once analysis is done, else the chosen type. */
const effectiveType = sql<string>`(case when ${inbound.analysisStatus} = 'done' and ${inbound.aiCategory} is not null then ${inbound.aiCategory} else ${inbound.type}::text end)`;

const fitSortValue = sql<number>`(case when ${inbound.analysisStatus} = 'done' and ${inbound.aiFitScore} is not null then ${inbound.aiFitScore}::int else ${RANKING.inbox.pendingFitScore}::int end)`;

const leaseExpired = sql`(${inbound.analysisClaimedAt} is null or ${inbound.analysisClaimedAt} < now() - make_interval(secs => ${ANALYSIS_LEASE_SECONDS}))`;

function tabCondition(tab: InboxTab): SQL | undefined {
  if (tab === 'filtered') return eq(inbound.isFiltered, true);
  const base = and(eq(inbound.isFiltered, false), ne(inbound.status, 'withdrawn'));
  if (tab === 'all') return base;
  return and(base, sql`${effectiveType} = ${INBOX_TAB_PITCH_TYPE[tab]}`);
}

function searchCondition(q: string | undefined): SQL | undefined {
  const term = q?.trim();
  if (!term) return undefined;
  const pattern = likePattern(term);
  return sql`(${inbound.subject} ilike ${pattern} or ${inbound.body} ilike ${pattern} or ${user.name} ilike ${pattern})`;
}

const inboxColumns = {
  id: inbound.id,
  spaceId: inbound.spaceId,
  senderMembershipId: inbound.senderMembershipId,
  type: inbound.type,
  subject: inbound.subject,
  body: inbound.body,
  links: inbound.links,
  status: inbound.status,
  isFiltered: inbound.isFiltered,
  creatorReply: inbound.creatorReply,
  repliedAt: inbound.repliedAt,
  readAt: inbound.readAt,
  shortlistedAt: inbound.shortlistedAt,
  questionGroupId: inbound.questionGroupId,
  questionGroupExcluded: inbound.questionGroupExcluded,
  createdAt: inbound.createdAt,
  updatedAt: inbound.updatedAt,
  analysisStatus: inbound.analysisStatus,
  analysisAttempts: inbound.analysisAttempts,
  analysisError: inbound.analysisError,
  analysisClaimedAt: inbound.analysisClaimedAt,
  contentHash: inbound.contentHash,
  scoredTasteVersion: inbound.scoredTasteVersion,
  aiSummary: inbound.aiSummary,
  aiCategory: inbound.aiCategory,
  aiFitScore: inbound.aiFitScore,
  aiFitReason: inbound.aiFitReason,
  aiTags: inbound.aiTags,
  aiSkills: inbound.aiSkills,
  aiIsSpam: inbound.aiIsSpam,
  embedding: inbound.embedding,
  senderName: user.name,
  senderHeadline: memberships.headline,
  senderImage: user.image,
  fitSortValue,
};

export function createPitchesRepo(db: Db) {
  function inboxQuery(tx: DbOrTx) {
    return tx
      .select(inboxColumns)
      .from(inbound)
      .innerJoin(memberships, eq(memberships.id, inbound.senderMembershipId))
      .innerJoin(user, eq(user.id, memberships.userId));
  }

  return {
    async insert(values: NewInboundRow, tx: DbOrTx = db): Promise<InboundRow> {
      const [row] = await tx.insert(inbound).values(values).returning();
      if (!row) throw new Error('insert into inbound returned no row');
      return row;
    },

    /** Seed only. */
    async insertMany(values: NewInboundRow[], tx: DbOrTx = db): Promise<InboundRow[]> {
      const out: InboundRow[] = [];
      for (const part of chunk(values, 200)) {
        out.push(...(await tx.insert(inbound).values(part).returning()));
      }
      return out;
    },

    async findById(spaceId: string, id: string, tx: DbOrTx = db): Promise<InboundRow | null> {
      const [row] = await tx
        .select()
        .from(inbound)
        .where(and(eq(inbound.spaceId, spaceId), eq(inbound.id, id)))
        .limit(1);
      return row ?? null;
    },

    /** Any space: PATCH /api/pitches/:id (sender withdraw) resolves the space from the pitch. */
    async findByIdAnySpace(id: string, tx: DbOrTx = db): Promise<InboundRow | null> {
      const [row] = await tx.select().from(inbound).where(eq(inbound.id, id)).limit(1);
      return row ?? null;
    },

    /** One pitch with sender fields (inbox side panel). */
    async findDetail(spaceId: string, id: string, tx: DbOrTx = db): Promise<InboxRow | null> {
      const [row] = await inboxQuery(tx)
        .where(and(eq(inbound.spaceId, spaceId), eq(inbound.id, id)))
        .limit(1);
      return row ?? null;
    },

    /** Several pitches of the space with sender fields (briefing highlights). */
    async findDetailsByIds(spaceId: string, ids: string[], tx: DbOrTx = db): Promise<InboxRow[]> {
      if (ids.length === 0) return [];
      return inboxQuery(tx).where(and(eq(inbound.spaceId, spaceId), inArray(inbound.id, ids)));
    },

    /** Sender withdraws: only while status is `new`. Null when not withdrawable (or not theirs). */
    async withdraw(
      id: string,
      senderMembershipId: string,
      tx: DbOrTx = db,
    ): Promise<InboundRow | null> {
      const [row] = await tx
        .update(inbound)
        .set({ status: 'withdrawn', updatedAt: new Date() })
        .where(
          and(
            eq(inbound.id, id),
            eq(inbound.senderMembershipId, senderMembershipId),
            eq(inbound.status, 'new'),
          ),
        )
        .returning();
      return row ?? null;
    },

    /** Creator: new / shortlisted / archived. Withdrawn pitches are left alone (returns null). */
    async setStatus(
      spaceId: string,
      id: string,
      status: Extract<PitchStatus, 'new' | 'shortlisted' | 'archived'>,
      tx: DbOrTx = db,
    ): Promise<InboundRow | null> {
      const now = new Date();
      const [row] = await tx
        .update(inbound)
        .set({
          status,
          updatedAt: now,
          // F31: stamped on the first shortlist only.
          ...(status === 'shortlisted'
            ? {
                shortlistedAt: sql`coalesce(${inbound.shortlistedAt}, ${now.toISOString()}::timestamptz)`,
              }
            : {}),
        })
        .where(
          and(eq(inbound.spaceId, spaceId), eq(inbound.id, id), ne(inbound.status, 'withdrawn')),
        )
        .returning();
      return row ?? null;
    },

    /** F31: stamps read_at on the first owner view; later views leave it alone. */
    async markRead(spaceId: string, id: string, tx: DbOrTx = db): Promise<void> {
      await tx
        .update(inbound)
        .set({ readAt: new Date() })
        .where(and(eq(inbound.spaceId, spaceId), eq(inbound.id, id), isNull(inbound.readAt)));
    },

    /** F31: answered question groups of these pitches: pitch id -> asked count + pinned post. */
    async answeredGroups(
      pitchIds: string[],
      tx: DbOrTx = db,
    ): Promise<Map<string, { count: number; postId: string }>> {
      if (pitchIds.length === 0) return new Map();
      const rows = await tx
        .select({
          pitchId: inbound.id,
          count: questionGroups.askedCount,
          postId: questionGroups.postId,
        })
        .from(inbound)
        .innerJoin(questionGroups, eq(questionGroups.id, inbound.questionGroupId))
        .where(and(inArray(inbound.id, pitchIds), eq(questionGroups.status, 'answered')));
      const out = new Map<string, { count: number; postId: string }>();
      for (const row of rows)
        if (row.postId) out.set(row.pitchId, { count: row.count, postId: row.postId });
      return out;
    },

    /** Creator restores a filtered pitch to All. */
    async restore(spaceId: string, id: string, tx: DbOrTx = db): Promise<InboundRow | null> {
      const [row] = await tx
        .update(inbound)
        .set({ isFiltered: false, updatedAt: new Date() })
        .where(and(eq(inbound.spaceId, spaceId), eq(inbound.id, id)))
        .returning();
      return row ?? null;
    },

    /** Creator reply: sets creator_reply, replied_at and status `replied`. Not on withdrawn. */
    async reply(
      spaceId: string,
      id: string,
      reply: string,
      tx: DbOrTx = db,
    ): Promise<InboundRow | null> {
      const now = new Date();
      const [row] = await tx
        .update(inbound)
        .set({ creatorReply: reply, repliedAt: now, status: 'replied', updatedAt: now })
        .where(
          and(eq(inbound.spaceId, spaceId), eq(inbound.id, id), ne(inbound.status, 'withdrawn')),
        )
        .returning();
      return row ?? null;
    },

    /** Back to pending, attempts 0 (rescore). clearEmbedding when the content changed. */
    async resetAnalysis(
      spaceId: string,
      id: string,
      { clearEmbedding = false }: { clearEmbedding?: boolean } = {},
      tx: DbOrTx = db,
    ): Promise<InboundRow | null> {
      const [row] = await tx
        .update(inbound)
        .set({
          analysisStatus: 'pending',
          analysisAttempts: 0,
          analysisError: null,
          analysisClaimedAt: null,
          ...(clearEmbedding ? { embedding: null } : {}),
        })
        .where(and(eq(inbound.spaceId, spaceId), eq(inbound.id, id)))
        .returning();
      return row ?? null;
    },

    /** The sender's pitches in the space (all statuses), newest first (MySpace.pitches). */
    async listBySender(
      spaceId: string,
      senderMembershipId: string,
      { limit = 100 }: { limit?: number } = {},
      tx: DbOrTx = db,
    ): Promise<InboundRow[]> {
      return tx
        .select()
        .from(inbound)
        .where(
          and(eq(inbound.spaceId, spaceId), eq(inbound.senderMembershipId, senderMembershipId)),
        )
        .orderBy(desc(inbound.createdAt), desc(inbound.id))
        .limit(limit);
    },

    /** Daily cap: pitches sent by the member to this space since `since`. */
    async countBySenderSince(
      spaceId: string,
      senderMembershipId: string,
      since: Date,
      tx: DbOrTx = db,
    ): Promise<number> {
      const [row] = await tx
        .select({ n: count() })
        .from(inbound)
        .where(
          and(
            eq(inbound.spaceId, spaceId),
            eq(inbound.senderMembershipId, senderMembershipId),
            gte(inbound.createdAt, since),
          ),
        );
      return row?.n ?? 0;
    },

    /**
     * Creator inbox. Tabs: all (not filtered, not withdrawn), type tabs (AI category when done,
     * else the chosen type), filtered (is_filtered). Sort `fit`: fit desc (pending = 50), then
     * newest; `newest`: created_at desc. Keyset cursor per sort (a cursor from the other sort is
     * rejected with 400).
     */
    async listInbox(
      spaceId: string,
      filter: InboxFilter,
      tx: DbOrTx = db,
    ): Promise<PageResult<InboxRow>> {
      const { tab, sort, status, q, cursor, limit } = filter;
      const conditions: Array<SQL | undefined> = [
        eq(inbound.spaceId, spaceId),
        tabCondition(tab),
        status ? eq(inbound.status, status) : undefined,
        searchCondition(q),
      ];
      if (sort === 'fit') {
        const position = decodeScoreCursor(cursor);
        if (position) {
          conditions.push(
            sql`(${fitSortValue}, ${inbound.createdAt}, ${inbound.id}) < (${Math.trunc(position.score)}::int, ${position.createdAt.toISOString()}::timestamptz, ${position.id}::uuid)`,
          );
        }
        const rows = await inboxQuery(tx)
          .where(and(...conditions))
          .orderBy(desc(fitSortValue), desc(inbound.createdAt), desc(inbound.id))
          .limit(limit + 1);
        return toPage(rows, limit, (last) =>
          encodeScoreCursor({ score: last.fitSortValue, createdAt: last.createdAt, id: last.id }),
        );
      }
      const position = decodeTimeCursor(cursor);
      if (position) {
        conditions.push(
          sql`(${inbound.createdAt}, ${inbound.id}) < (${position.createdAt.toISOString()}::timestamptz, ${position.id}::uuid)`,
        );
      }
      const rows = await inboxQuery(tx)
        .where(and(...conditions))
        .orderBy(desc(inbound.createdAt), desc(inbound.id))
        .limit(limit + 1);
      return toPage(rows, limit, encodeTimeCursor);
    },

    /** Count per inbox tab, with the same status/q filters as the list. */
    async tabCounts(
      spaceId: string,
      { status, q }: { status?: PitchStatus | undefined; q?: string | undefined } = {},
      tx: DbOrTx = db,
    ): Promise<Record<InboxTab, number>> {
      const tabCount = (tab: InboxTab) =>
        sql<number>`count(*) filter (where ${tabCondition(tab)})`.mapWith(Number);
      const [row] = await tx
        .select({
          all: tabCount('all'),
          collabs: tabCount('collabs'),
          brand_deals: tabCount('brand_deals'),
          ideas: tabCount('ideas'),
          press: tabCount('press'),
          fan_notes: tabCount('fan_notes'),
          filtered: tabCount('filtered'),
        })
        .from(inbound)
        .innerJoin(memberships, eq(memberships.id, inbound.senderMembershipId))
        .innerJoin(user, eq(user.id, memberships.userId))
        .where(
          and(
            eq(inbound.spaceId, spaceId),
            status ? eq(inbound.status, status) : undefined,
            searchCondition(q),
          ),
        );
      const counts = Object.fromEntries(INBOX_TABS.map((tab) => [tab, 0])) as Record<
        InboxTab,
        number
      >;
      if (row) for (const tab of INBOX_TABS) counts[tab] = Number(row[tab] ?? 0);
      return counts;
    },

    /** Pitches created in [from, to) (overview "pitches"). Bounds optional. */
    async countCreated(
      spaceId: string,
      { from, to }: { from?: Date; to?: Date } = {},
      tx: DbOrTx = db,
    ): Promise<number> {
      const [row] = await tx
        .select({ n: count() })
        .from(inbound)
        .where(
          and(
            eq(inbound.spaceId, spaceId),
            from ? gte(inbound.createdAt, from) : undefined,
            to ? lt(inbound.createdAt, to) : undefined,
          ),
        );
      return row?.n ?? 0;
    },

    /**
     * Opportunities waiting: status new, not filtered, ai_fit_score >= RANKING.opportunityFitMin,
     * optionally limited to pitches created in [createdFrom, createdTo).
     */
    async countOpportunities(
      spaceId: string,
      { createdFrom, createdTo }: { createdFrom?: Date; createdTo?: Date } = {},
      tx: DbOrTx = db,
    ): Promise<number> {
      const [row] = await tx
        .select({ n: count() })
        .from(inbound)
        .where(
          and(
            eq(inbound.spaceId, spaceId),
            eq(inbound.status, 'new'),
            eq(inbound.isFiltered, false),
            eq(inbound.analysisStatus, 'done'),
            gte(inbound.aiFitScore, RANKING.opportunityFitMin),
            createdFrom ? gte(inbound.createdAt, createdFrom) : undefined,
            createdTo ? lt(inbound.createdAt, createdTo) : undefined,
          ),
        );
      return row?.n ?? 0;
    },

    /** Inbox mix since `since`: by effective type, filtered pitches as `spam`. */
    async inboxMix(
      spaceId: string,
      since: Date,
      tx: DbOrTx = db,
    ): Promise<Array<{ key: InboxMixKey; count: number }>> {
      const key = sql<string>`(case when ${inbound.isFiltered} then 'spam' else ${effectiveType} end)`;
      const rows = await tx
        .select({ key, n: count() })
        .from(inbound)
        .where(
          and(
            eq(inbound.spaceId, spaceId),
            gte(inbound.createdAt, since),
            ne(inbound.status, 'withdrawn'),
          ),
        )
        .groupBy(key)
        .orderBy(desc(count()));
      return rows.map((row) => ({ key: row.key as InboxMixKey, count: row.n }));
    },

    /** Briefing candidates: new/shortlisted, not filtered, analyzed, best fit first. */
    async listTopByFit(
      spaceId: string,
      { limit = 10, since }: { limit?: number; since?: Date } = {},
      tx: DbOrTx = db,
    ): Promise<InboxRow[]> {
      return inboxQuery(tx)
        .where(
          and(
            eq(inbound.spaceId, spaceId),
            inArray(inbound.status, ['new', 'shortlisted']),
            eq(inbound.isFiltered, false),
            eq(inbound.analysisStatus, 'done'),
            since ? gte(inbound.createdAt, since) : undefined,
          ),
        )
        .orderBy(sql`${inbound.aiFitScore} desc nulls last`, desc(inbound.createdAt))
        .limit(limit);
    },

    // ------------------------------------------------------------ analysis

    async countPendingAnalysis(spaceId: string, tx: DbOrTx = db): Promise<number> {
      const [row] = await tx
        .select({ n: count() })
        .from(inbound)
        .where(and(eq(inbound.spaceId, spaceId), eq(inbound.analysisStatus, 'pending')));
      return row?.n ?? 0;
    },

    async getForAnalysis(id: string, tx: DbOrTx = db): Promise<AnalysisSubject | null> {
      const [row] = await tx
        .select({
          id: inbound.id,
          spaceId: inbound.spaceId,
          type: inbound.type,
          title: inbound.subject,
          body: inbound.body,
          links: inbound.links,
          contentHash: inbound.contentHash,
          analysisStatus: inbound.analysisStatus,
          analysisAttempts: inbound.analysisAttempts,
          scoredTasteVersion: inbound.scoredTasteVersion,
          hasEmbedding: sql<boolean>`${inbound.embedding} is not null`,
          tasteProfile: spaces.tasteProfile,
          tasteVersion: spaces.tasteVersion,
          creatorName: spaces.displayName,
        })
        .from(inbound)
        .innerJoin(spaces, eq(spaces.id, inbound.spaceId))
        .where(eq(inbound.id, id))
        .limit(1);
      if (!row) return null;
      return { kind: 'inbound', ...row, communityName: null, deleted: false };
    },

    /**
     * Writes a triage result (see posts.saveAnalysis). is_filtered follows the spam flag only on
     * the first successful analysis, so a creator's Restore survives later rescoring.
     */
    async saveAnalysis(
      id: string,
      fields: AnalysisFields,
      { expectedContentHash }: { expectedContentHash?: string } = {},
      tx: DbOrTx = db,
    ): Promise<boolean> {
      const rows = await tx
        .update(inbound)
        .set({
          analysisStatus: 'done',
          analysisError: null,
          analysisClaimedAt: null,
          isFiltered: sql`case when ${inbound.scoredTasteVersion} is null then ${fields.isSpam} else ${inbound.isFiltered} end`,
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
            eq(inbound.id, id),
            expectedContentHash ? eq(inbound.contentHash, expectedContentHash) : undefined,
          ),
        )
        .returning({ id: inbound.id });
      return rows.length > 0;
    },

    async markFailed(id: string, error: string, tx: DbOrTx = db): Promise<MarkFailedResult | null> {
      const [row] = await tx
        .update(inbound)
        .set({
          analysisAttempts: sql`${inbound.analysisAttempts} + 1`,
          analysisStatus: sql`case when ${inbound.analysisAttempts} + 1 >= ${LIMITS.ai.maxAttempts} then 'failed'::analysis_status else 'pending'::analysis_status end`,
          analysisError: error.slice(0, 1000),
          analysisClaimedAt: null,
        })
        .where(eq(inbound.id, id))
        .returning({ attempts: inbound.analysisAttempts, status: inbound.analysisStatus });
      return row ?? null;
    },

    /** See posts.claimPending. */
    async claimPending(spaceId: string, limit: number, tx: DbOrTx = db): Promise<string[]> {
      const candidates = tx
        .select({ id: inbound.id })
        .from(inbound)
        .where(
          and(eq(inbound.spaceId, spaceId), eq(inbound.analysisStatus, 'pending'), leaseExpired),
        )
        .orderBy(asc(inbound.createdAt))
        .limit(limit)
        .for('update', { skipLocked: true });
      const rows = await tx
        .update(inbound)
        .set({ analysisClaimedAt: sql`now()` })
        .where(inArray(inbound.id, candidates))
        .returning({ id: inbound.id });
      return rows.map((row) => row.id);
    },

    async claimItem(id: string, tx: DbOrTx = db): Promise<boolean> {
      const rows = await tx
        .update(inbound)
        .set({ analysisClaimedAt: sql`now()` })
        .where(and(eq(inbound.id, id), leaseExpired))
        .returning({ id: inbound.id });
      return rows.length > 0;
    },

    /** Gives an item back without consuming an attempt (budget reached, AI disabled). */
    async releaseClaim(id: string, tx: DbOrTx = db): Promise<void> {
      await tx.update(inbound).set({ analysisClaimedAt: null }).where(eq(inbound.id, id));
    },

    async remainingPending(spaceId: string, tx: DbOrTx = db): Promise<number> {
      const [row] = await tx
        .select({ n: count() })
        .from(inbound)
        .where(
          and(eq(inbound.spaceId, spaceId), eq(inbound.analysisStatus, 'pending'), leaseExpired),
        );
      return row?.n ?? 0;
    },
  };
}

export type PitchesRepo = ReturnType<typeof createPitchesRepo>;
