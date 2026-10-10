import { sql } from 'drizzle-orm';
import type { Db } from '../db/client.js';

export interface JobLockResult<T> {
  /** False when another process (or tick) holds the lock: `fn` did not run. */
  ran: boolean;
  result?: T;
}

/**
 * Runs `fn` only if no one else is running the job `name` right now, across processes:
 * `pg_try_advisory_xact_lock(hashtext('job:' + name))` in a transaction that stays open while
 * `fn` runs, so the lock is released when it ends (commit, error or a dropped connection).
 * `fn` uses its own queries (not this transaction): a long job never holds one big transaction.
 * Errors from `fn` propagate after the lock is released.
 */
export async function withJobLock<T>(
  db: Db,
  name: string,
  fn: () => Promise<T>,
): Promise<JobLockResult<T>> {
  return db.transaction(async (tx) => {
    const [row] = await tx.execute<{ locked: boolean }>(
      sql`select pg_try_advisory_xact_lock(hashtext(${`job:${name}`})) as locked`,
    );
    if (!row?.locked) return { ran: false };
    return { ran: true, result: await fn() };
  });
}
