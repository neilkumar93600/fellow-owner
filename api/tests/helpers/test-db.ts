import { sql } from 'drizzle-orm';
import { closeDb, db } from '../../src/db/client.js';

export { closeDb, db };

/** Every table, children first (TRUNCATE ... CASCADE handles the rest). */
const TABLES = [
  'click_events',
  'promotions',
  'ai_feedback',
  'ai_runs',
  'digests',
  'team_members',
  'signals',
  'comments',
  'posts',
  'inbound',
  'follower_communities',
  'followers',
  'community_members',
  'memberships',
  'communities',
  'asks',
  'notifications',
  'imports',
  'spaces',
  'verification',
  'account',
  'session',
  '"user"',
];

/**
 * Empties the test database (TEST_DATABASE_URL, migrated by global-setup.ts).
 * Call in beforeAll/beforeEach of integration files; files run one at a time.
 */
export async function resetDatabase(): Promise<void> {
  await db.execute(sql.raw(`truncate table ${TABLES.join(', ')} restart identity cascade`));
}
