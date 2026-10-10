import type { TasteProfile } from '@fellow-owners/shared';
import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import type { Db, DbOrTx } from '../db/client.js';
import { user } from '../db/schema/auth.js';
import { type NewSpaceRow, type SpaceRow, spaces } from '../db/schema/spaces.js';

/** Fields the owner can change (PUT /api/studio/settings `profile` and `showReadReceipts`). */
export type SpaceProfileUpdate = Partial<
  Pick<
    NewSpaceRow,
    | 'displayName'
    | 'bio'
    | 'avatarUrl'
    | 'coverUrl'
    | 'platforms'
    | 'aiDailyTokenBudget'
    | 'showReadReceipts'
  >
>;

export interface SpaceOwner {
  id: string;
  name: string;
  image: string | null;
}

export function createSpacesRepo(db: Db) {
  async function findById(id: string, tx: DbOrTx = db): Promise<SpaceRow | null> {
    const [row] = await tx.select().from(spaces).where(eq(spaces.id, id)).limit(1);
    return row ?? null;
  }

  return {
    findById,

    /** Exact lookup; pass the handle lowercased (handleParamsSchema already does). */
    async findByHandle(handle: string, tx: DbOrTx = db): Promise<SpaceRow | null> {
      const [row] = await tx
        .select()
        .from(spaces)
        .where(eq(spaces.handle, handle.trim().toLowerCase()))
        .limit(1);
      return row ?? null;
    },

    /** The caller's own space (one per user in the MVP). */
    async findByOwnerUserId(userId: string, tx: DbOrTx = db): Promise<SpaceRow | null> {
      const [row] = await tx.select().from(spaces).where(eq(spaces.ownerUserId, userId)).limit(1);
      return row ?? null;
    },

    async handleExists(handle: string, tx: DbOrTx = db): Promise<boolean> {
      const [row] = await tx
        .select({ id: spaces.id })
        .from(spaces)
        .where(eq(spaces.handle, handle))
        .limit(1);
      return Boolean(row);
    },

    /** Which of `handles` are taken (for handle-check suggestions). */
    async findTakenHandles(handles: string[], tx: DbOrTx = db): Promise<Set<string>> {
      if (handles.length === 0) return new Set();
      const rows = await tx
        .select({ handle: spaces.handle })
        .from(spaces)
        .where(inArray(spaces.handle, handles));
      return new Set(rows.map((row) => row.handle));
    },

    async insert(values: NewSpaceRow, tx: DbOrTx = db): Promise<SpaceRow> {
      const [row] = await tx.insert(spaces).values(values).returning();
      if (!row) throw new Error('insert into spaces returned no row');
      return row;
    },

    async update(id: string, patch: SpaceProfileUpdate, tx: DbOrTx = db): Promise<SpaceRow | null> {
      if (Object.keys(patch).length === 0) return findById(id, tx);
      const [row] = await tx
        .update(spaces)
        .set({ ...patch, updatedAt: new Date() })
        .where(eq(spaces.id, id))
        .returning();
      return row ?? null;
    },

    /** Saves the taste profile and bumps taste_version by one (existing scores become stale). */
    async saveTasteProfile(
      id: string,
      tasteProfile: TasteProfile,
      tx: DbOrTx = db,
    ): Promise<SpaceRow | null> {
      const [row] = await tx
        .update(spaces)
        .set({
          tasteProfile,
          tasteVersion: sql`${spaces.tasteVersion} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(spaces.id, id))
        .returning();
      return row ?? null;
    },

    /** Setup checklist: stamps bio_link_shared_at the first time only. Returns the space. */
    async markBioLinkShared(spaceId: string, tx: DbOrTx = db): Promise<SpaceRow | null> {
      await tx
        .update(spaces)
        .set({ bioLinkSharedAt: new Date() })
        .where(and(eq(spaces.id, spaceId), isNull(spaces.bioLinkSharedAt)));
      return findById(spaceId, tx);
    },

    /** The owner's user record (name for StudioSpace.ownerName and AI prompts). Never the email. */
    async getOwner(spaceId: string, tx: DbOrTx = db): Promise<SpaceOwner | null> {
      const [row] = await tx
        .select({ id: user.id, name: user.name, image: user.image })
        .from(spaces)
        .innerJoin(user, eq(user.id, spaces.ownerUserId))
        .where(eq(spaces.id, spaceId))
        .limit(1);
      return row ?? null;
    },

    async listDemo(tx: DbOrTx = db): Promise<SpaceRow[]> {
      return tx.select().from(spaces).where(eq(spaces.isDemo, true));
    },

    /** Demo reset: deletes every `is_demo` space; everything with its space_id cascades. */
    async deleteDemoSpaces(tx: DbOrTx = db): Promise<number> {
      const rows = await tx
        .delete(spaces)
        .where(eq(spaces.isDemo, true))
        .returning({ id: spaces.id });
      return rows.length;
    },

    async deleteById(id: string, tx: DbOrTx = db): Promise<boolean> {
      const rows = await tx.delete(spaces).where(eq(spaces.id, id)).returning({ id: spaces.id });
      return rows.length > 0;
    },
  };
}

export type SpacesRepo = ReturnType<typeof createSpacesRepo>;
