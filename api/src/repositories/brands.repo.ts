import type { Db } from '../db/client.js';

/**
 * F5 Brand inbox: brand_requests (db/schema/brands.ts) and spaces.inbound_email_alias.
 * Wave A skeleton (registered as repos.brands); B4 adds the queries: insert with
 * (space_id, source, external_id) dedupe, list/counts by status, read/status updates, the daily
 * pick, and the space lookup by alias for the email webhook.
 */
export function createBrandsRepo(_db: Db) {
  return {};
}

export type BrandsRepo = ReturnType<typeof createBrandsRepo>;
