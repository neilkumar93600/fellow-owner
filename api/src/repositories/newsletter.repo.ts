import type { NewsletterSource } from '@fellow-owners/shared';
import { and, eq, isNull, or, sql } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { newsletterSubscribers } from '../db/schema/index.js';

export function createNewsletterRepo(db: Db) {
  return {
    /**
     * Records a sign-up. True when the address still has to confirm: a new row, or one that never
     * confirmed or had unsubscribed (that row goes back to pending). False when already confirmed.
     */
    async requestOptIn(email: string, source: NewsletterSource): Promise<boolean> {
      const inserted = await db
        .insert(newsletterSubscribers)
        .values({ email, source })
        .onConflictDoNothing()
        .returning({ id: newsletterSubscribers.id });
      if (inserted.length > 0) return true;
      const reset = await db
        .update(newsletterSubscribers)
        .set({ confirmedAt: null, unsubscribedAt: null })
        .where(
          and(
            eq(newsletterSubscribers.email, email),
            or(
              isNull(newsletterSubscribers.confirmedAt),
              sql`${newsletterSubscribers.unsubscribedAt} is not null`,
            ),
          ),
        )
        .returning({ id: newsletterSubscribers.id });
      return reset.length > 0;
    },

    /** Stamps confirmed_at once; an address that has since unsubscribed stays unsubscribed. */
    async confirm(email: string): Promise<void> {
      await db
        .update(newsletterSubscribers)
        .set({ confirmedAt: sql`coalesce(${newsletterSubscribers.confirmedAt}, now())` })
        .where(
          and(eq(newsletterSubscribers.email, email), isNull(newsletterSubscribers.unsubscribedAt)),
        );
    },

    async unsubscribe(email: string): Promise<void> {
      await db
        .update(newsletterSubscribers)
        .set({ unsubscribedAt: sql`coalesce(${newsletterSubscribers.unsubscribedAt}, now())` })
        .where(eq(newsletterSubscribers.email, email));
    },
  };
}
