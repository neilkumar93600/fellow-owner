import { fileURLToPath } from 'node:url';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

/**
 * Applies the SQL migrations in src/db/migrations (pnpm db:migrate).
 * Uses DATABASE_URL, or TEST_DATABASE_URL with `--test` (pnpm db:migrate:test).
 * Reads the URL directly instead of the full env so deploy pipelines only need the database URL.
 */

const DEV_URL = 'postgres://fellow:fellow@localhost:5432/fellow_owners';
const TEST_URL = 'postgres://fellow:fellow@localhost:5432/fellow_owners_test';

function redact(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.password) parsed.password = '***';
    return parsed.toString();
  } catch {
    return '(unparseable url)';
  }
}

export async function runMigrations(url: string): Promise<void> {
  const client = postgres(url, { max: 1, prepare: false, onnotice: () => {} });
  try {
    await migrate(drizzle(client), {
      migrationsFolder: fileURLToPath(new URL('./migrations', import.meta.url)),
    });
  } finally {
    await client.end({ timeout: 5 });
  }
}

async function main(): Promise<void> {
  const useTest = process.argv.includes('--test');
  const url = useTest
    ? (process.env.TEST_DATABASE_URL ?? TEST_URL)
    : (process.env.DATABASE_URL ?? (process.env.NODE_ENV === 'production' ? undefined : DEV_URL));
  if (!url) {
    console.error('[migrate] DATABASE_URL is not set');
    process.exit(1);
  }
  const started = Date.now();
  console.info(`[migrate] applying migrations to ${redact(url)}`);
  try {
    await runMigrations(url);
    console.info(`[migrate] done in ${Date.now() - started} ms`);
    process.exit(0);
  } catch (error) {
    console.error('[migrate] failed:', error);
    process.exit(1);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await main();
}
