import type { SupportKind } from '@fellow-owners/shared';
import type { Db } from '../db/client.js';
import { supportRequests } from '../db/schema/index.js';

/** support_requests (contact and privacy forms). */
export function createSupportRepo(db: Db) {
  return {
    async create(row: {
      kind: SupportKind;
      name: string | null;
      email: string;
      message: string;
      userId: string | null;
    }): Promise<void> {
      await db.insert(supportRequests).values(row);
    },
  };
}

export type SupportRepo = ReturnType<typeof createSupportRepo>;
