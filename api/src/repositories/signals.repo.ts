import type { SignalKind } from '@fellow-owners/shared';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { chunk, type Db, type DbOrTx, inTransaction } from '../db/client.js';
import { posts } from '../db/schema/posts.js';
import { type NewSignalRow, signals } from '../db/schema/social.js';

/** Matches the shared SignalState response. */
export interface SignalStateRow {
  useCount: number;
  buildCount: number;
  viewerSignals: SignalKind[];
}

/** `use_count`/`build_count` += delta (never below 0). */
const counterPatch = (kind: SignalKind, delta: 1 | -1) =>
  kind === 'use'
    ? { useCount: sql<number>`greatest(0, ${posts.useCount} + ${delta})` }
    : { buildCount: sql<number>`greatest(0, ${posts.buildCount} + ${delta})` };

export function createSignalsRepo(db: Db) {
  async function kindsFor(postId: string, membershipId: string, tx: DbOrTx = db) {
    const rows = await tx
      .select({ kind: signals.kind })
      .from(signals)
      .where(and(eq(signals.postId, postId), eq(signals.membershipId, membershipId)));
    return rows.map((row) => row.kind).sort();
  }

  async function stateOf(
    postId: string,
    membershipId: string,
    tx: DbOrTx,
  ): Promise<SignalStateRow> {
    const [counts] = await tx
      .select({ useCount: posts.useCount, buildCount: posts.buildCount })
      .from(posts)
      .where(eq(posts.id, postId))
      .limit(1);
    return {
      useCount: counts?.useCount ?? 0,
      buildCount: counts?.buildCount ?? 0,
      viewerSignals: await kindsFor(postId, membershipId, tx),
    };
  }

  return {
    /** Idempotent add: the counter moves only when a row was inserted. Same transaction. */
    async add(
      postId: string,
      membershipId: string,
      kind: SignalKind,
      tx?: DbOrTx,
    ): Promise<SignalStateRow & { changed: boolean }> {
      return inTransaction(db, tx, async (t) => {
        const inserted = await t
          .insert(signals)
          .values({ postId, membershipId, kind })
          .onConflictDoNothing()
          .returning({ kind: signals.kind });
        if (inserted.length > 0) {
          await t.update(posts).set(counterPatch(kind, 1)).where(eq(posts.id, postId));
        }
        return { ...(await stateOf(postId, membershipId, t)), changed: inserted.length > 0 };
      });
    },

    /** Idempotent remove: the counter moves only when a row was deleted. Same transaction. */
    async remove(
      postId: string,
      membershipId: string,
      kind: SignalKind,
      tx?: DbOrTx,
    ): Promise<SignalStateRow & { changed: boolean }> {
      return inTransaction(db, tx, async (t) => {
        const deleted = await t
          .delete(signals)
          .where(
            and(
              eq(signals.postId, postId),
              eq(signals.membershipId, membershipId),
              eq(signals.kind, kind),
            ),
          )
          .returning({ kind: signals.kind });
        if (deleted.length > 0) {
          await t.update(posts).set(counterPatch(kind, -1)).where(eq(posts.id, postId));
        }
        return { ...(await stateOf(postId, membershipId, t)), changed: deleted.length > 0 };
      });
    },

    /** Current counts + the viewer's own signals on one post. */
    async state(postId: string, membershipId: string, tx: DbOrTx = db): Promise<SignalStateRow> {
      return stateOf(postId, membershipId, tx);
    },

    kindsFor,

    /** The viewer's signals on many posts (PostCard.viewerSignals). */
    async viewerSignals(
      postIds: string[],
      membershipId: string,
      tx: DbOrTx = db,
    ): Promise<Map<string, SignalKind[]>> {
      const out = new Map<string, SignalKind[]>(postIds.map((id) => [id, []]));
      if (postIds.length === 0) return out;
      const rows = await tx
        .select({ postId: signals.postId, kind: signals.kind })
        .from(signals)
        .where(and(inArray(signals.postId, postIds), eq(signals.membershipId, membershipId)));
      for (const row of rows) out.get(row.postId)?.push(row.kind);
      for (const kinds of out.values()) kinds.sort();
      return out;
    },

    /** Seed only: no counter updates (follow with posts.recountCounters). */
    async insertMany(values: NewSignalRow[], tx: DbOrTx = db): Promise<void> {
      for (const part of chunk(values, 1000)) {
        await tx.insert(signals).values(part).onConflictDoNothing();
      }
    },
  };
}

export type SignalsRepo = ReturnType<typeof createSignalsRepo>;
