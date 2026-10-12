import type { Db } from '../db/client.js';

/**
 * F4 Fan collaboration: polls, poll_options, poll_votes, project_updates and post_follows
 * (db/schema/collab.ts), plus the posts.feedback_wanted_at / backed_at / backed_note flags.
 * Wave A skeleton (registered as repos.collab); B3 adds the queries.
 */
export function createCollabRepo(_db: Db) {
  return {};
}

export type CollabRepo = ReturnType<typeof createCollabRepo>;
