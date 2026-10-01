import { runMigrations } from '../../src/db/migrate.js';

/**
 * Vitest globalSetup for the integration project: applies every migration to TEST_DATABASE_URL
 * once per run (idempotent). Tables are reset per test file by the helpers in test-db.ts.
 */
export default async function setup(): Promise<void> {
  const url =
    process.env.TEST_DATABASE_URL ?? 'postgres://fellow:fellow@localhost:5432/fellow_owners_test';
  await runMigrations(url);
}
