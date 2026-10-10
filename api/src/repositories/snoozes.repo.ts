import type { Db } from '../db/client.js';

/** studio_snoozes (Today "Later"). Stub: F16 adds the queries. */
export function createSnoozesRepo(_db: Db) {
  return {};
}

export type SnoozesRepo = ReturnType<typeof createSnoozesRepo>;
