import type { Db } from '../db/client.js';

/** page_visits (hashed bio-page visitors per day). Stub: F14 adds the queries. */
export function createPageVisitsRepo(_db: Db) {
  return {};
}

export type PageVisitsRepo = ReturnType<typeof createPageVisitsRepo>;
