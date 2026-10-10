import { sql } from 'drizzle-orm';
import { check, pgTable, primaryKey, text } from 'drizzle-orm/pg-core';
import { timestamptz } from './columns.js';

export const JOB_RUN_STATUSES = ['running', 'ok', 'failed', 'skipped'] as const;
export type JobRunStatus = (typeof JOB_RUN_STATUSES)[number];

/**
 * One row per scheduled job per slot (POST /api/cron/tick). Hourly jobs use the hour start as the
 * slot; a daily or weekly job is due while its slot has no `ok` run, so a missed tick catches up.
 * Purged after 30 days.
 */
export const jobRuns = pgTable(
  'job_runs',
  {
    job: text('job').notNull(),
    slot: timestamptz('slot').notNull(),
    startedAt: timestamptz('started_at').notNull().defaultNow(),
    finishedAt: timestamptz('finished_at'),
    status: text('status').$type<JobRunStatus>().notNull().default('running'),
    error: text('error'),
  },
  (t) => [
    primaryKey({ name: 'job_runs_pk', columns: [t.job, t.slot] }),
    check(
      'job_runs_status_check',
      sql`${t.status} in (${sql.raw(JOB_RUN_STATUSES.map((v) => `'${v}'`).join(', '))})`,
    ),
  ],
);

export type JobRunRow = typeof jobRuns.$inferSelect;
export type NewJobRunRow = typeof jobRuns.$inferInsert;
