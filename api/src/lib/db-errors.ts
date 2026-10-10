/**
 * Postgres error inspection for the few places that recover from a constraint race instead of
 * letting the error middleware answer 409 (handle taken, showcase slug or short code collisions).
 * postgres.js errors arrive directly or wrapped by drizzle (DrizzleQueryError.cause).
 */

interface PgLikeError {
  code?: unknown;
  constraint_name?: unknown;
  constraint?: unknown;
  cause?: unknown;
}

/** The violated unique constraint/index name when `error` is a 23505, else null. */
export function uniqueViolation(error: unknown): string | null {
  let current: unknown = error;
  for (let depth = 0; depth < 4 && current && typeof current === 'object'; depth += 1) {
    const candidate = current as PgLikeError;
    if (candidate.code === '23505') {
      const name = candidate.constraint_name ?? candidate.constraint;
      return typeof name === 'string' ? name : '';
    }
    current = candidate.cause;
  }
  return null;
}
