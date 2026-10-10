import { notImplemented } from '../lib/errors.js';

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

/**
 * The jobs due at `date` (UTC): hourly sweep, group_questions, close_challenges, email_digests;
 * 09:00 demo_reset + purge; 06:00 refresh_followers; Monday 13:00 community_digests.
 * Stub: F09 writes the schedule and the tick.
 */
export function dueJobs(_date: Date): JobName[] {
  throw notImplemented('Job schedule');
}
