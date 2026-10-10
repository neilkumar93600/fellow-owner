import type { Db } from '../db/client.js';

/** Cross-table reads and writes for account export and deletion. Stub: F08 adds the queries. */
export function createAccountRepo(_db: Db) {
  return {};
}

export type AccountRepo = ReturnType<typeof createAccountRepo>;
