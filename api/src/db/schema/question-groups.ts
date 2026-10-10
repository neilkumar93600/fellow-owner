import { QUESTION_GROUP_STATUSES, type QuestionGroupStatus } from '@fellow-owners/shared';
import { sql } from 'drizzle-orm';
import {
  type AnyPgColumn,
  check,
  date,
  index,
  integer,
  pgTable,
  smallint,
  text,
  uuid,
} from 'drizzle-orm/pg-core';
import { createdAt, embedding, timestamptz, updatedAt, uuidPk } from './columns.js';
import { posts } from './posts.js';
import { spaces } from './spaces.js';

const inList = (values: readonly string[]) => sql.raw(values.map((v) => `'${v}'`).join(', '));

/**
 * F32 Answer Once: pitches asking the same thing, answered once. Members are the inbound rows with
 * this question_group_id; asker quotes are cut from their bodies at read time (no stored copy).
 * `embedding` is the members' centroid; `post_id` is the first pinned answer post
 * (posts.question_group_id links every one of them).
 */
export const questionGroups = pgTable(
  'question_groups',
  {
    id: uuidPk(),
    spaceId: uuid('space_id')
      .notNull()
      .references(() => spaces.id, { onDelete: 'cascade' }),
    /** The AI's one-line version of the question. */
    question: text('question').notNull(),
    status: text('status').$type<QuestionGroupStatus>().notNull().default('open'),
    /** AI draft in the creator's voice; null while the AI is pending or failed. */
    draft: text('draft'),
    answer: text('answer'),
    embedding: embedding(),
    askedCount: integer('asked_count').notNull().default(0),
    firstAskedAt: timestamptz('first_asked_at').notNull(),
    lastAskedAt: timestamptz('last_asked_at').notNull(),
    answeredAt: timestamptz('answered_at'),
    postId: uuid('post_id').references((): AnyPgColumn => posts.id, { onDelete: 'set null' }),
    pinnedCommunityIds: uuid('pinned_community_ids').array().notNull().default(sql`'{}'::uuid[]`),
    /** Redrafts: LIMITS.answerOnce.redraftsPerDay per group per UTC day (`YYYY-MM-DD`). */
    redraftsDate: date('redrafts_date', { mode: 'string' }),
    redraftsUsed: smallint('redrafts_used').notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('question_groups_space_status_asked_idx').on(
      t.spaceId,
      t.status,
      t.lastAskedAt.desc().nullsFirst(),
    ),
    check('question_groups_status_check', sql`${t.status} in (${inList(QUESTION_GROUP_STATUSES)})`),
    check('question_groups_counts_check', sql`${t.askedCount} >= 0 and ${t.redraftsUsed} >= 0`),
  ],
);

export type QuestionGroupRow = typeof questionGroups.$inferSelect;
export type NewQuestionGroupRow = typeof questionGroups.$inferInsert;
