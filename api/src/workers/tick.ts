import { and, desc, eq, gte, sql } from 'drizzle-orm';
import { z } from 'zod';
import type { CoreDeps } from '../container.js';
import { type JobRunRow, jobRuns } from '../db/schema/index.js';
import { withJobLock } from '../lib/job-lock.js';

/** Every job the hourly tick (POST /api/cron/tick) can run; container.ts wires each one. */
export const JOB_NAMES = [
  'sweep',
  'group_questions',
  'close_challenges',
  'email_digests',
  'demo_reset',
  'purge',
  'refresh_followers',
  'community_digests',
] as const;
export type JobName = (typeof JOB_NAMES)[number];

/** What each job runs (container.ts `jobs`). */
export type Jobs = Record<JobName, () => Promise<unknown>>;

/** `?job=<name>` on the tick: run that one job now. */
export const tickQuerySchema = z.object({ job: z.enum(JOB_NAMES).optional() });

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** Daily and weekly jobs (UTC); every other job runs hourly. `weekday` 1 = Monday. */
const SCHEDULE: Partial<Record<JobName, { hour: number; weekday?: number }>> = {
  demo_reset: { hour: 9 },
  purge: { hour: 9 },
  refresh_followers: { hour: 6 },
  community_digests: { hour: 13, weekday: 1 },
};

/**
 * The latest slot of `job` at or before `date`: the hour start for hourly jobs, the latest
 * scheduled hour (and weekday) for the others. A slot with no `ok` run is due, so a missed tick
 * catches up at the next one.
 */
export function jobSlot(job: JobName, date: Date): Date {
  const time = date.getTime();
  const at = SCHEDULE[job];
  if (!at) return new Date(Math.floor(time / HOUR) * HOUR);
  const dayStart = Math.floor(time / DAY) * DAY;
  let slot = dayStart + at.hour * HOUR;
  if (at.weekday !== undefined) {
    slot -= ((new Date(dayStart).getUTCDay() - at.weekday + 7) % 7) * DAY;
  }
  if (slot > time) slot -= (at.weekday === undefined ? 1 : 7) * DAY;
  return new Date(slot);
}

/**
 * The jobs scheduled in the hour of `date` (UTC): hourly sweep, group_questions, close_challenges,
 * email_digests; 09:00 demo_reset + purge; 06:00 refresh_followers; Monday 13:00 community_digests.
 */
export function dueJobs(date: Date): JobName[] {
  const hourStart = Math.floor(date.getTime() / HOUR) * HOUR;
  return JOB_NAMES.filter((job) => jobSlot(job, date).getTime() === hourStart);
}

export type TickDeps = Pick<CoreDeps, 'db' | 'env' | 'logger' | 'background'> & { jobs: Jobs };

interface PlannedRun {
  job: JobName;
  slot: Date;
  /** `?job=` runs: always run, even when the slot already has an `ok` run. */
  manual: boolean;
}

/**
 * The tick: picks the jobs whose current slot has no `ok` run (or just `only`), starts them one
 * after another in the background and resolves with their names at once. Each job runs under
 * its advisory lock and re-checks its slot inside it, so overlapping ticks run each job once.
 */
export async function startTick(
  deps: TickDeps,
  options: { only?: JobName; now?: Date } = {},
): Promise<JobName[]> {
  const now = options.now ?? new Date();
  const planned: PlannedRun[] = options.only
    ? [{ job: options.only, slot: now, manual: true }]
    : await pendingRuns(deps, now);

  if (planned.length > 0) {
    deps.background.run('tick', async () => {
      for (const run of planned) await runJob(deps, run);
    });
  }
  return planned.map((run) => run.job);
}

async function pendingRuns(deps: TickDeps, now: Date): Promise<PlannedRun[]> {
  // Slots are at most a week old (the weekly job), so one indexed range read covers them all.
  const done = await deps.db
    .select({ job: jobRuns.job, slot: jobRuns.slot })
    .from(jobRuns)
    .where(and(eq(jobRuns.status, 'ok'), gte(jobRuns.slot, new Date(now.getTime() - 8 * DAY))));
  const doneKeys = new Set(done.map((row) => `${row.job}@${row.slot.getTime()}`));

  return JOB_NAMES.filter((job) => job !== 'demo_reset' || deps.env.DEMO_ENABLED)
    .map((job) => ({ job, slot: jobSlot(job, now), manual: false }))
    .filter((run) => !doneKeys.has(`${run.job}@${run.slot.getTime()}`));
}

async function hasOkRun(deps: TickDeps, job: JobName, slot: Date): Promise<boolean> {
  const [row] = await deps.db
    .select({ job: jobRuns.job })
    .from(jobRuns)
    .where(and(eq(jobRuns.job, job), eq(jobRuns.slot, slot), eq(jobRuns.status, 'ok')));
  return Boolean(row);
}

async function runJob(deps: TickDeps, { job, slot, manual }: PlannedRun): Promise<void> {
  const { db } = deps;
  const started = Date.now();
  const finish = (status: 'ok' | 'failed', error: string | null) =>
    db
      .update(jobRuns)
      .set({ status, error, finishedAt: sql`now()` })
      .where(and(eq(jobRuns.job, job), eq(jobRuns.slot, slot)));

  let ran = false;
  let error: string | null = null;
  try {
    await withJobLock(db, job, async () => {
      if (!manual && (await hasOkRun(deps, job, slot))) return;
      ran = true;
      await db
        .insert(jobRuns)
        .values({ job, slot })
        .onConflictDoUpdate({
          target: [jobRuns.job, jobRuns.slot],
          set: { status: 'running', startedAt: sql`now()`, finishedAt: null, error: null },
        });
      try {
        await deps.jobs[job]();
        await finish('ok', null);
      } catch (cause) {
        error = (cause instanceof Error ? cause.message : String(cause)).slice(0, 1000);
        await finish('failed', error);
      }
    });
  } catch (cause) {
    // The lock or the job_runs bookkeeping failed (database trouble): log it, go on to the next job.
    error = cause instanceof Error ? cause.message : String(cause);
  }
  const log = { job, ran, ms: Date.now() - started, error };
  if (error) deps.logger.error(log, 'cron job failed');
  else deps.logger.info(log, 'cron job');
}

export interface JobRunView {
  job: string;
  slot: string;
  startedAt: string;
  finishedAt: string | null;
  status: JobRunRow['status'];
  error: string | null;
}

/** GET /api/cron/status: the last 50 runs, newest first. */
export async function recentRuns(deps: Pick<CoreDeps, 'db'>): Promise<JobRunView[]> {
  const rows = await deps.db.select().from(jobRuns).orderBy(desc(jobRuns.startedAt)).limit(50);
  return rows.map((row) => ({
    job: row.job,
    slot: row.slot.toISOString(),
    startedAt: row.startedAt.toISOString(),
    finishedAt: row.finishedAt?.toISOString() ?? null,
    status: row.status,
    error: row.error,
  }));
}
