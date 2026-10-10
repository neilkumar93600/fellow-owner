import { LIMITS } from '@fellow-owners/shared';
import { z } from 'zod';
import { badRequest } from './errors.js';

/**
 * Opaque cursors: base64url(JSON). Clients pass them back unchanged in `?cursor=`.
 * A malformed or tampered cursor is a 400 bad_request, never a 500.
 */

export function encodeCursor(value: unknown): string {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
}

/** Decodes and validates a cursor. Returns null when `cursor` is empty. */
export function decodeCursor<S extends z.ZodType>(
  cursor: string | null | undefined,
  schema: S,
): z.output<S> | null {
  if (!cursor) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
  } catch {
    throw badRequest('Invalid cursor');
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) throw badRequest('Invalid cursor');
  return parsed.data;
}

/** Page size from `?limit=`: default 20, clamped to 1..50 (shared LIMITS.pagination). */
export function clampLimit(limit?: number | null): number {
  const { defaultPageSize, maxPageSize } = LIMITS.pagination;
  if (limit === undefined || limit === null || !Number.isFinite(limit)) return defaultPageSize;
  return Math.min(maxPageSize, Math.max(1, Math.trunc(limit)));
}

// ------------------------------------------------------------- (created_at, id) keyset cursors

/** Keyset position for lists ordered by `created_at desc, id desc`. */
export interface TimeCursor {
  createdAt: Date;
  id: string;
}

const timeCursorSchema = z
  .object({ t: z.iso.datetime({ offset: true }), i: z.string().min(1).max(64) })
  .transform(({ t, i }) => ({ createdAt: new Date(t), id: i }));

export function encodeTimeCursor(row: { createdAt: Date; id: string | number }): string {
  return encodeCursor({ t: row.createdAt.toISOString(), i: String(row.id) });
}

export function decodeTimeCursor(cursor: string | null | undefined): TimeCursor | null {
  return decodeCursor(cursor, timeCursorSchema);
}

// ------------------------------------------------------------- generic sort-key cursors

/** Keyset position for lists ordered by a numeric key, then created_at, then id (all desc). */
export interface ScoreCursor {
  score: number;
  createdAt: Date;
  id: string;
}

const scoreCursorSchema = z
  .object({
    s: z.number(),
    t: z.iso.datetime({ offset: true }),
    i: z.string().min(1).max(64),
  })
  .transform(({ s, t, i }) => ({ score: s, createdAt: new Date(t), id: i }));

export function encodeScoreCursor(row: ScoreCursor): string {
  return encodeCursor({ s: row.score, t: row.createdAt.toISOString(), i: row.id });
}

export function decodeScoreCursor(cursor: string | null | undefined): ScoreCursor | null {
  return decodeCursor(cursor, scoreCursorSchema);
}

// ------------------------------------------------------------- offset cursors (ranked lists)

const offsetCursorSchema = z.object({ o: z.number().int().min(0).max(100_000) });

/** For lists ranked in code (ideas, people), where keyset paging is not practical. */
export function encodeOffsetCursor(offset: number): string {
  return encodeCursor({ o: offset });
}

export function decodeOffsetCursor(cursor: string | null | undefined): number {
  return decodeCursor(cursor, offsetCursorSchema)?.o ?? 0;
}

// ------------------------------------------------------------- page assembly

export interface PageResult<T> {
  items: T[];
  nextCursor: string | null;
}

/**
 * Builds a page from rows fetched with `limit + 1`: the extra row only signals that more exist.
 * `cursorOf` receives the last row kept on this page.
 */
export function toPage<T>(rows: T[], limit: number, cursorOf: (last: T) => string): PageResult<T> {
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const last = items[items.length - 1];
  return { items, nextCursor: hasMore && last !== undefined ? cursorOf(last) : null };
}

/** Slices an in-memory ranked list with an offset cursor. */
export function pageByOffset<T>(
  ranked: T[],
  cursor: string | null | undefined,
  limit: number,
): PageResult<T> {
  const offset = decodeOffsetCursor(cursor);
  const items = ranked.slice(offset, offset + limit);
  const next = offset + items.length;
  return { items, nextCursor: next < ranked.length ? encodeOffsetCursor(next) : null };
}

/** Maps the items of a page, keeping its cursor. */
export function mapPage<T, U>(page: PageResult<T>, map: (item: T) => U): PageResult<U> {
  return { items: page.items.map(map), nextCursor: page.nextCursor };
}
