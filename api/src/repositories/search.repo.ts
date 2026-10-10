import {
  and,
  asc,
  cosineDistance,
  eq,
  isNotNull,
  isNull,
  lte,
  ne,
  type SQL,
  sql,
} from 'drizzle-orm';
import type { Db, DbOrTx } from '../db/client.js';
import { inbound } from '../db/schema/inbound.js';
import { memberships } from '../db/schema/memberships.js';
import { posts } from '../db/schema/posts.js';

/** One semantic match: the row id and its cosine distance (0 = same direction, 2 = opposite). */
export interface Nearest {
  id: string;
  distance: number;
}

/**
 * pgvector nearest-neighbour search inside one space (`embedding <=> $vector`, cosine distance,
 * HNSW indexes on posts, inbound and memberships). Only rows a space owner would see count:
 * posts not hidden or deleted, pitches not flagged as spam or withdrawn, members not removed (and
 * not the owner). Rows without an embedding are skipped. Callers load the rows they need by id.
 */
export function createSearchRepo(db: Db) {
  return {
    async nearestPosts(
      spaceId: string,
      vector: number[],
      k: number,
      options: { excludeId?: string; maxDistance?: number } = {},
      tx: DbOrTx = db,
    ): Promise<Nearest[]> {
      const distance = cosineDistance(posts.embedding, vector);
      const where: Array<SQL | undefined> = [
        eq(posts.spaceId, spaceId),
        isNull(posts.deletedAt),
        isNull(posts.hiddenAt),
        isNotNull(posts.embedding),
        options.excludeId ? ne(posts.id, options.excludeId) : undefined,
        options.maxDistance !== undefined ? lte(distance, options.maxDistance) : undefined,
      ];
      return tx
        .select({ id: posts.id, distance: distance.mapWith(Number) })
        .from(posts)
        .where(and(...where))
        .orderBy(asc(distance), asc(posts.id))
        .limit(k);
    },

    async nearestPitches(
      spaceId: string,
      vector: number[],
      k: number,
      tx: DbOrTx = db,
    ): Promise<Nearest[]> {
      const distance = cosineDistance(inbound.embedding, vector);
      return tx
        .select({ id: inbound.id, distance: distance.mapWith(Number) })
        .from(inbound)
        .where(
          and(
            eq(inbound.spaceId, spaceId),
            isNotNull(inbound.embedding),
            ne(inbound.status, 'withdrawn'),
            sql`${inbound.aiIsSpam} is not true`,
          ),
        )
        .orderBy(asc(distance), asc(inbound.id))
        .limit(k);
    },

    async nearestMembers(
      spaceId: string,
      vector: number[],
      k: number,
      options: { excludeMembershipId?: string } = {},
      tx: DbOrTx = db,
    ): Promise<Nearest[]> {
      const distance = cosineDistance(memberships.embedding, vector);
      return tx
        .select({ id: memberships.id, distance: distance.mapWith(Number) })
        .from(memberships)
        .where(
          and(
            eq(memberships.spaceId, spaceId),
            isNull(memberships.removedAt),
            ne(memberships.role, 'owner'),
            isNotNull(memberships.embedding),
            options.excludeMembershipId
              ? ne(memberships.id, options.excludeMembershipId)
              : undefined,
          ),
        )
        .orderBy(asc(distance), asc(memberships.id))
        .limit(k);
    },
  };
}

export type SearchRepo = ReturnType<typeof createSearchRepo>;
