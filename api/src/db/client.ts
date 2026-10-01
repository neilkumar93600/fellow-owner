import { type ExtractTablesWithRelations, getTableName, type SQL, sql } from 'drizzle-orm';
import type { AnyPgColumn, PgTransaction } from 'drizzle-orm/pg-core';
import { drizzle, type PostgresJsQueryResultHKT } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '../config/env.js';
import * as schema from './schema/index.js';

export { schema };
export type Schema = typeof schema;

export interface CreateDbOptions {
  url?: string;
  max?: number;
}

/**
 * postgres.js with `prepare: false` (required by the Supabase transaction pooler on port 6543)
 * and drizzle over the full schema, so `db.query.*` relational queries work everywhere.
 */
export function createDb({
  url = env.DATABASE_URL,
  max = env.DATABASE_POOL_MAX,
}: CreateDbOptions = {}) {
  const client = postgres(url, {
    prepare: false,
    max,
    idle_timeout: 20,
    max_lifetime: 60 * 30,
    connect_timeout: 10,
    onnotice: () => {},
    connection: { application_name: 'fellow-owners-api' },
  });
  const db = drizzle(client, { schema });
  return { db, client };
}

const created = createDb();

/** The process-wide database handle. */
export const db = created.db;
/** The raw postgres.js client behind `db` (for health checks and shutdown). */
export const sqlClient = created.client;

export type Db = typeof db;
/** A transaction handle, as passed to `db.transaction(async (tx) => ...)`. */
export type Tx = PgTransaction<
  PostgresJsQueryResultHKT,
  Schema,
  ExtractTablesWithRelations<Schema>
>;
/** Repository functions accept either the root handle or a transaction. */
export type DbOrTx = Db | Tx;

/**
 * Runs `fn` inside `tx` when one is given (joining the caller's transaction), otherwise opens a
 * new transaction. Repositories use it so multi-statement writes (insert + counter update) are
 * atomic whether or not the service already started a transaction.
 */
export function inTransaction<T>(
  root: Db,
  tx: DbOrTx | undefined,
  fn: (tx: Tx) => Promise<T>,
): Promise<T> {
  if (tx && tx !== root) return fn(tx as Tx);
  return root.transaction((inner) => fn(inner));
}

/** Round-trip check for GET /api/health. Resolves false instead of throwing. */
export async function pingDb(handle: DbOrTx = db, timeoutMs = 2000): Promise<boolean> {
  let timer: NodeJS.Timeout | undefined;
  try {
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('db ping timeout')), timeoutMs);
    });
    await Promise.race([handle.execute(sql`select 1`), timeout]);
    return true;
  } catch {
    return false;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Closes the pool (graceful shutdown, scripts, tests). Takes no arguments so it can be passed
 * straight to hooks: `afterAll(closeDb)`.
 */
export async function closeDb(): Promise<void> {
  await sqlClient.end({ timeout: 5 });
}

/** `%term%` for ILIKE with %, _ and \ escaped (Postgres' default LIKE escape is backslash). */
export function likePattern(term: string): string {
  return `%${term.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}

/** Splits bulk inserts so one statement stays well under Postgres' 65,535 parameter limit. */
export function chunk<T>(rows: readonly T[], size = 500): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size));
  return out;
}

/**
 * A fully qualified column reference ("table"."column"). Use it for every column inside a
 * correlated subquery: drizzle renders columns unqualified in single-table queries, so
 * `${communities.id}` inside `(select ... from posts where ...)` would silently bind to posts.id.
 */
export function qcol(column: AnyPgColumn): SQL {
  return sql`${sql.identifier(getTableName(column.table))}.${sql.identifier(column.name)}`;
}
