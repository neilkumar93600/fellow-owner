import type { NewsletterSource } from '@fellow-owners/shared';
import type { Db } from '../db/client.js';
import { newsletterSubscribers } from '../db/schema/index.js';

export function createNewsletterRepo(db: Db) {
  return {
    /** Idempotent: an existing email is left as it is. */
    async subscribe(email: string, source: NewsletterSource): Promise<void> {
      await db.insert(newsletterSubscribers).values({ email, source }).onConflictDoNothing();
    },
  };
}
