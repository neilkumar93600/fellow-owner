import type { Db } from '../db/client.js';

/** reports (F25 moderation queue). Stub: F07 adds the queries. */
export function createReportsRepo(_db: Db) {
  return {};
}

export type ReportsRepo = ReturnType<typeof createReportsRepo>;
