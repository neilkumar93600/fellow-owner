import type { Db } from '../db/client.js';

/**
 * F3 Content planner: plan_items (db/schema/planner.ts).
 * Wave A skeleton (registered as repos.planner); B2 adds the queries: a space's items in a range,
 * CRUD scoped by space_id, and the reminder scan (planned, not reminded, due within the hour; the
 * plan_items_due_idx partial index) that stamps reminded_at in the same statement.
 */
export function createPlannerRepo(_db: Db) {
  return {};
}

export type PlannerRepo = ReturnType<typeof createPlannerRepo>;
