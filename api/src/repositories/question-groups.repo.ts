import { LIMITS, type PitchType } from '@fellow-owners/shared';
import { and, asc, desc, eq, gte, inArray, isNull, notInArray, or, sql } from 'drizzle-orm';
import type { Db, DbOrTx } from '../db/client.js';
import { inbound } from '../db/schema/inbound.js';
import {
  type NewQuestionGroupRow,
  type QuestionGroupRow,
  questionGroups,
} from '../db/schema/question-groups.js';
import { type SpaceRow, spaces } from '../db/schema/spaces.js';

/** C6: only these pitch types are ever grouped (never brand deals, press or collabs). */
export const GROUPABLE_PITCH_TYPES: readonly PitchType[] = ['fan_note', 'idea', 'other'];

/** A pitch in a group, as the studio shows it (quotes are cut from body at read time). */
export interface GroupMemberRow {
  id: string;
  questionGroupId: string;
  senderMembershipId: string;
  subject: string;
  body: string;
  status: (typeof inbound.$inferSelect)['status'];
  createdAt: Date;
}

/** A pitch the grouping job may place. */
export interface GroupCandidateRow {
  id: string;
  subject: string;
  body: string;
  embedding: number[] | null;
  createdAt: Date;
}

/** Eligible for grouping: groupable type, not spam, still waiting, ungrouped, never excluded. */
function candidateWhere(spaceId: string, since: Date) {
  return and(
    eq(inbound.spaceId, spaceId),
    inArray(inbound.type, [...GROUPABLE_PITCH_TYPES]),
    eq(inbound.isFiltered, false),
    sql`${inbound.aiIsSpam} is not true`,
    inArray(inbound.status, ['new', 'shortlisted']),
    gte(inbound.createdAt, since),
    isNull(inbound.questionGroupId),
    eq(inbound.questionGroupExcluded, false),
  );
}

/** question_groups and the pitches in them (F32 Answer Once). Every read is scoped by space. */
export function createQuestionGroupsRepo(db: Db) {
  return {
    async findById(spaceId: string, id: string, tx: DbOrTx = db): Promise<QuestionGroupRow | null> {
      const [row] = await tx
        .select()
        .from(questionGroups)
        .where(and(eq(questionGroups.spaceId, spaceId), eq(questionGroups.id, id)))
        .limit(1);
      return row ?? null;
    },

    async space(spaceId: string, tx: DbOrTx = db): Promise<SpaceRow | null> {
      const [row] = await tx.select().from(spaces).where(eq(spaces.id, spaceId)).limit(1);
      return row ?? null;
    },

    /**
     * The studio list: open groups with at least `minSize` askers (newest ask first), then
     * answered ones (newest answer first). Dismissed groups are hidden.
     * ponytail: capped at 100; a space with more live groups would need paging.
     */
    async listVisible(
      spaceId: string,
      minSize: number,
      tx: DbOrTx = db,
    ): Promise<QuestionGroupRow[]> {
      return tx
        .select()
        .from(questionGroups)
        .where(
          and(
            eq(questionGroups.spaceId, spaceId),
            or(
              eq(questionGroups.status, 'answered'),
              and(eq(questionGroups.status, 'open'), gte(questionGroups.askedCount, minSize)),
            ),
          ),
        )
        .orderBy(
          sql`(${questionGroups.status} = 'open') desc`,
          sql`coalesce(${questionGroups.answeredAt}, ${questionGroups.lastAskedAt}) desc`,
          desc(questionGroups.id),
        )
        .limit(100);
    },

    /** The pitches in these groups, newest first. */
    async members(groupIds: string[], tx: DbOrTx = db): Promise<GroupMemberRow[]> {
      if (groupIds.length === 0) return [];
      return tx
        .select({
          id: inbound.id,
          questionGroupId: sql<string>`${inbound.questionGroupId}`,
          senderMembershipId: inbound.senderMembershipId,
          subject: inbound.subject,
          body: inbound.body,
          status: inbound.status,
          createdAt: inbound.createdAt,
        })
        .from(inbound)
        .where(inArray(inbound.questionGroupId, groupIds))
        .orderBy(desc(inbound.createdAt), desc(inbound.id));
    },

    /** askedCount per group id (post cards, C1). */
    async askedCounts(ids: string[], tx: DbOrTx = db): Promise<Map<string, number>> {
      if (ids.length === 0) return new Map();
      const rows = await tx
        .select({ id: questionGroups.id, askedCount: questionGroups.askedCount })
        .from(questionGroups)
        .where(inArray(questionGroups.id, ids));
      return new Map(rows.map((row) => [row.id, row.askedCount]));
    },

    /** Marks an open group answered. Null when it is missing or no longer open (the 409 guard). */
    async claimAnswer(
      spaceId: string,
      id: string,
      values: { answer: string; pinnedCommunityIds: string[]; now: Date },
      tx: DbOrTx = db,
    ): Promise<QuestionGroupRow | null> {
      const [row] = await tx
        .update(questionGroups)
        .set({
          status: 'answered',
          answer: values.answer,
          answeredAt: values.now,
          pinnedCommunityIds: values.pinnedCommunityIds,
          updatedAt: values.now,
        })
        .where(
          and(
            eq(questionGroups.spaceId, spaceId),
            eq(questionGroups.id, id),
            eq(questionGroups.status, 'open'),
          ),
        )
        .returning();
      return row ?? null;
    },

    async setPost(id: string, postId: string, tx: DbOrTx = db): Promise<QuestionGroupRow | null> {
      const [row] = await tx
        .update(questionGroups)
        .set({ postId })
        .where(eq(questionGroups.id, id))
        .returning();
      return row ?? null;
    },

    async dismiss(spaceId: string, id: string, tx: DbOrTx = db): Promise<QuestionGroupRow | null> {
      const [row] = await tx
        .update(questionGroups)
        .set({ status: 'dismissed', updatedAt: new Date() })
        .where(
          and(
            eq(questionGroups.spaceId, spaceId),
            eq(questionGroups.id, id),
            eq(questionGroups.status, 'open'),
          ),
        )
        .returning();
      return row ?? null;
    },

    /**
     * Takes one redraft of today's allowance (`today` is YYYY-MM-DD, UTC) from an open group.
     * Null when the group is missing, not open, or out of redrafts.
     */
    async useRedraft(
      spaceId: string,
      id: string,
      today: string,
      tx: DbOrTx = db,
    ): Promise<QuestionGroupRow | null> {
      const [row] = await tx
        .update(questionGroups)
        .set({
          redraftsUsed: sql`case when ${questionGroups.redraftsDate} = ${today}::date then ${questionGroups.redraftsUsed} + 1 else 1 end`,
          redraftsDate: today,
        })
        .where(
          and(
            eq(questionGroups.spaceId, spaceId),
            eq(questionGroups.id, id),
            eq(questionGroups.status, 'open'),
            sql`(${questionGroups.redraftsDate} is distinct from ${today}::date or ${questionGroups.redraftsUsed} < ${LIMITS.answerOnce.redraftsPerDay})`,
          ),
        )
        .returning();
      return row ?? null;
    },

    /** Gives back a redraft the AI could not deliver. */
    async refundRedraft(id: string, today: string, tx: DbOrTx = db): Promise<void> {
      await tx
        .update(questionGroups)
        .set({ redraftsUsed: sql`greatest(${questionGroups.redraftsUsed} - 1, 0)` })
        .where(and(eq(questionGroups.id, id), eq(questionGroups.redraftsDate, today)));
    },

    async setNaming(
      id: string,
      values: { question?: string; draft: string },
      tx: DbOrTx = db,
    ): Promise<QuestionGroupRow | null> {
      const [row] = await tx
        .update(questionGroups)
        .set({ ...values, updatedAt: new Date() })
        .where(eq(questionGroups.id, id))
        .returning();
      return row ?? null;
    },

    /** Takes a pitch out of its group for good. False when it is not in that group. */
    async removeMember(
      spaceId: string,
      groupId: string,
      pitchId: string,
      tx: DbOrTx = db,
    ): Promise<boolean> {
      const rows = await tx
        .update(inbound)
        .set({ questionGroupId: null, questionGroupExcluded: true })
        .where(
          and(
            eq(inbound.spaceId, spaceId),
            eq(inbound.id, pitchId),
            eq(inbound.questionGroupId, groupId),
          ),
        )
        .returning({ id: inbound.id });
      return rows.length > 0;
    },

    // ------------------------------------------------------------ grouping job

    async candidates(spaceId: string, since: Date, tx: DbOrTx = db): Promise<GroupCandidateRow[]> {
      return tx
        .select({
          id: inbound.id,
          subject: inbound.subject,
          body: inbound.body,
          embedding: inbound.embedding,
          createdAt: inbound.createdAt,
        })
        .from(inbound)
        .where(candidateWhere(spaceId, since))
        .orderBy(asc(inbound.createdAt), asc(inbound.id));
    },

    async setPitchEmbedding(id: string, vector: number[], tx: DbOrTx = db): Promise<void> {
      await tx.update(inbound).set({ embedding: vector }).where(eq(inbound.id, id));
    },

    /** Open groups with a centroid: what new pitches may join. */
    async openCentroids(
      spaceId: string,
      tx: DbOrTx = db,
    ): Promise<Array<{ id: string; centroid: number[]; size: number }>> {
      const rows = await tx
        .select({
          id: questionGroups.id,
          centroid: questionGroups.embedding,
          size: questionGroups.askedCount,
        })
        .from(questionGroups)
        .where(and(eq(questionGroups.spaceId, spaceId), eq(questionGroups.status, 'open')));
      return rows.flatMap((row) => (row.centroid ? [{ ...row, centroid: row.centroid }] : []));
    },

    /** Open groups big enough to show that still wait for the AI's question and draft. */
    async needsNaming(spaceId: string, tx: DbOrTx = db): Promise<QuestionGroupRow[]> {
      return tx
        .select()
        .from(questionGroups)
        .where(
          and(
            eq(questionGroups.spaceId, spaceId),
            eq(questionGroups.status, 'open'),
            isNull(questionGroups.draft),
            gte(questionGroups.askedCount, LIMITS.answerOnce.minGroupSize),
          ),
        )
        .orderBy(asc(questionGroups.createdAt))
        .limit(20);
    },

    async insert(values: NewQuestionGroupRow, tx: DbOrTx = db): Promise<QuestionGroupRow> {
      const [row] = await tx.insert(questionGroups).values(values).returning();
      if (!row) throw new Error('insert into question_groups returned no row');
      return row;
    },

    async deleteById(id: string, tx: DbOrTx = db): Promise<void> {
      await tx.delete(questionGroups).where(eq(questionGroups.id, id));
    },

    /**
     * Puts still-eligible pitches into a group that is still open. Returns how many moved in (0
     * when the group was answered or dismissed since the job read it). Call it in a transaction:
     * the group row stays locked until commit, so an answer waits for the join (and replies to
     * the new askers too) or wins and the join is skipped.
     */
    async assign(
      spaceId: string,
      groupId: string,
      pitchIds: string[],
      since: Date,
      tx: DbOrTx = db,
    ): Promise<number> {
      if (pitchIds.length === 0) return 0;
      const [open] = await tx
        .select({ id: questionGroups.id })
        .from(questionGroups)
        .where(
          and(
            eq(questionGroups.spaceId, spaceId),
            eq(questionGroups.id, groupId),
            eq(questionGroups.status, 'open'),
          ),
        )
        .for('update');
      if (!open) return 0;
      const rows = await tx
        .update(inbound)
        .set({ questionGroupId: groupId })
        .where(and(candidateWhere(spaceId, since), inArray(inbound.id, pitchIds)))
        .returning({ id: inbound.id });
      return rows.length;
    },

    /** Recomputes asked_count, the centroid and the first/last ask from the group's pitches. */
    async refreshStats(id: string, tx: DbOrTx = db): Promise<QuestionGroupRow | null> {
      const members = sql`(select count(*)::int as n, avg(${inbound.embedding}) as centroid, min(${inbound.createdAt}) as first_at, max(${inbound.createdAt}) as last_at from ${inbound} where ${inbound.questionGroupId} = ${id})`;
      const [row] = await tx
        .update(questionGroups)
        .set({
          askedCount: sql`(select n from ${members} m)`,
          embedding: sql`coalesce((select centroid from ${members} m), ${questionGroups.embedding})`,
          firstAskedAt: sql`coalesce((select first_at from ${members} m), ${questionGroups.firstAskedAt})`,
          lastAskedAt: sql`coalesce((select last_at from ${members} m), ${questionGroups.lastAskedAt})`,
          updatedAt: new Date(),
        })
        .where(eq(questionGroups.id, id))
        .returning();
      return row ?? null;
    },

    /**
     * Spaces worth a grouping run: a groupable pitch arrived since `since`, or an open group still
     * waits for its question and draft.
     */
    async dueSpaceIds(since: Date, tx: DbOrTx = db): Promise<string[]> {
      const rows = await tx.execute<{ space_id: string }>(sql`
        select distinct ${inbound.spaceId} as space_id from ${inbound}
        where ${inbound.createdAt} >= ${since.toISOString()}::timestamptz
          and ${inArray(inbound.type, [...GROUPABLE_PITCH_TYPES])}
          and ${inbound.questionGroupId} is null
          and ${inbound.questionGroupExcluded} = false
        union
        select ${questionGroups.spaceId} from ${questionGroups}
        where ${questionGroups.status} = 'open' and ${questionGroups.draft} is null
          and ${questionGroups.askedCount} >= ${LIMITS.answerOnce.minGroupSize}`);
      return rows.map((row) => row.space_id);
    },

    /** Pitches of a group still waiting for a reply (Answer: reply-all). */
    async unreplied(groupId: string, tx: DbOrTx = db): Promise<GroupMemberRow[]> {
      return tx
        .select({
          id: inbound.id,
          questionGroupId: sql<string>`${inbound.questionGroupId}`,
          senderMembershipId: inbound.senderMembershipId,
          subject: inbound.subject,
          body: inbound.body,
          status: inbound.status,
          createdAt: inbound.createdAt,
        })
        .from(inbound)
        .where(
          and(
            eq(inbound.questionGroupId, groupId),
            notInArray(inbound.status, ['replied', 'withdrawn']),
          ),
        )
        .orderBy(asc(inbound.createdAt));
    },
  };
}

export type QuestionGroupsRepo = ReturnType<typeof createQuestionGroupsRepo>;
