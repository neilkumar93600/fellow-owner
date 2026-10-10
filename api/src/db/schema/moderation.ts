import {
  LIMITS,
  REPORT_REASONS,
  REPORT_STATUSES,
  REPORT_TARGETS,
  type ReportReason,
  type ReportStatus,
  type ReportTarget,
} from '@fellow-owners/shared';
import { sql } from 'drizzle-orm';
import { check, index, pgTable, text, unique, uuid } from 'drizzle-orm/pg-core';
import { user } from './auth.js';
import { createdAt, timestamptz, uuidPk } from './columns.js';
import { spaces } from './spaces.js';

const inList = (values: readonly string[]) => sql.raw(values.map((v) => `'${v}'`).join(', '));

/**
 * F25: a member reports a post or a comment; the space owner resolves or dismisses it.
 * `target_id` is a posts.id or comments.id (no FK: either table). One report per reporter and target.
 */
export const reports = pgTable(
  'reports',
  {
    id: uuidPk(),
    spaceId: uuid('space_id')
      .notNull()
      .references(() => spaces.id, { onDelete: 'cascade' }),
    /** Null once the reporter deleted their account. */
    reporterUserId: text('reporter_user_id').references(() => user.id, { onDelete: 'set null' }),
    targetType: text('target_type').$type<ReportTarget>().notNull(),
    targetId: uuid('target_id').notNull(),
    reason: text('reason').$type<ReportReason>().notNull(),
    note: text('note'),
    status: text('status').$type<ReportStatus>().notNull().default('open'),
    resolvedByUserId: text('resolved_by_user_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    resolvedAt: timestamptz('resolved_at'),
    createdAt: createdAt(),
  },
  (t) => [
    unique('reports_reporter_target_key').on(t.reporterUserId, t.targetType, t.targetId),
    index('reports_space_status_created_idx').on(
      t.spaceId,
      t.status,
      t.createdAt.desc().nullsFirst(),
    ),
    check('reports_target_type_check', sql`${t.targetType} in (${inList(REPORT_TARGETS)})`),
    check('reports_reason_check', sql`${t.reason} in (${inList(REPORT_REASONS)})`),
    check('reports_status_check', sql`${t.status} in (${inList(REPORT_STATUSES)})`),
    check(
      'reports_note_check',
      sql`${t.note} is null or char_length(${t.note}) <= ${sql.raw(String(LIMITS.reports.noteMax))}`,
    ),
  ],
);

export type ReportRow = typeof reports.$inferSelect;
export type NewReportRow = typeof reports.$inferInsert;
