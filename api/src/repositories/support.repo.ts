import type { Db } from '../db/client.js';

/** support_requests (contact and privacy forms). Stub: F11 adds the queries. */
export function createSupportRepo(_db: Db) {
  return {};
}

export type SupportRepo = ReturnType<typeof createSupportRepo>;
