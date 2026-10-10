import {
  FEEDBACK_REF_TYPES,
  FEEDBACK_VERDICTS,
  type FeedbackRefType,
  type FeedbackVerdict,
} from '@fellow-owners/shared';
import { sql } from 'drizzle-orm';
import {
  bigserial,
  check,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  smallint,
  text,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { user } from './auth.js';
import { createdAt, updatedAt, uuidPk } from './columns.js';
import { communities } from './communities.js';
import { spaces } from './spaces.js';

/**
 * Cached AI briefings (community_id null) and community digests (P1), one per UTC day.
 * `content` holds the task output; the briefing service owns its shape.
 */
export const digests = pgTable(
  'digests',
  {
    id: uuidPk(),
    spaceId: uuid('space_id')
      .notNull()
      .references(() => spaces.id, { onDelete: 'cascade' }),
    communityId: uuid('community_id').references(() => communities.id, { onDelete: 'cascade' }),
    /** UTC day, `YYYY-MM-DD`. */
    periodDate: date('period_date', { mode: 'string' }).notNull(),
    content: jsonb('content').$type<Record<string, unknown>>().notNull(),
    model: text('model').notNull(),
    /** Max 5 a day (LIMITS.briefing.regenerationsPerDay). */
    regenerations: smallint('regenerations').notNull().default(0),
    createdAt: createdAt(),
    /** When the content was last (re)generated. */
    updatedAt: updatedAt(),
  },
  (t) => [
    unique('digests_space_community_period_key')
      .on(t.spaceId, t.communityId, t.periodDate)
      .nullsNotDistinct(),
    index('digests_period_idx').on(t.periodDate),
    index('digests_community_idx').on(t.communityId),
    check('digests_regenerations_check', sql`${t.regenerations} >= 0`),
  ],
);

/** One row per AI call: cost, latency, errors. Budget and cap checks read from it. */
export const aiRuns = pgTable(
  'ai_runs',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    spaceId: uuid('space_id')
      .notNull()
      .references(() => spaces.id, { onDelete: 'cascade' }),
    /** Who triggered it, for per-user limits. */
    userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
    /** triageItem, embedItem, suggestCommunities, briefing, promoteDrafts, ... */
    task: text('task').notNull(),
    refType: text('ref_type'),
    refId: uuid('ref_id'),
    model: text('model').notNull(),
    inputTokens: integer('input_tokens').notNull().default(0),
    outputTokens: integer('output_tokens').notNull().default(0),
    latencyMs: integer('latency_ms').notNull().default(0),
    /** `ok` or `error`. */
    status: text('status').notNull(),
    error: text('error'),
    createdAt: createdAt(),
  },
  (t) => [
    index('ai_runs_space_created_idx').on(t.spaceId, t.createdAt),
    index('ai_runs_user_task_created_idx').on(t.userId, t.task, t.createdAt),
    index('ai_runs_created_idx').on(t.createdAt),
  ],
);

/** Creator thumbs up or down on AI picks. */
export const aiFeedback = pgTable(
  'ai_feedback',
  {
    id: uuidPk(),
    spaceId: uuid('space_id')
      .notNull()
      .references(() => spaces.id, { onDelete: 'cascade' }),
    refType: text('ref_type').$type<FeedbackRefType>().notNull(),
    /** Item id, or `{digest_id}:{index}` for a briefing highlight. */
    refId: text('ref_id').notNull(),
    verdict: text('verdict').$type<FeedbackVerdict>().notNull(),
    createdByUserId: text('created_by_user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    createdAt: createdAt(),
  },
  (t) => [
    unique('ai_feedback_ref_user_key').on(t.refType, t.refId, t.createdByUserId),
    index('ai_feedback_space_idx').on(t.spaceId, t.refType),
    index('ai_feedback_created_by_idx').on(t.createdByUserId),
    check(
      'ai_feedback_ref_type_check',
      sql`${t.refType} in (${sql.raw(FEEDBACK_REF_TYPES.map((v) => `'${v}'`).join(', '))})`,
    ),
    check(
      'ai_feedback_verdict_check',
      sql`${t.verdict} in (${sql.raw(FEEDBACK_VERDICTS.map((v) => `'${v}'`).join(', '))})`,
    ),
  ],
);

export type DigestRow = typeof digests.$inferSelect;
export type NewDigestRow = typeof digests.$inferInsert;
export type AiRunRow = typeof aiRuns.$inferSelect;
export type NewAiRunRow = typeof aiRuns.$inferInsert;
export type AiFeedbackRow = typeof aiFeedback.$inferSelect;
export type NewAiFeedbackRow = typeof aiFeedback.$inferInsert;
