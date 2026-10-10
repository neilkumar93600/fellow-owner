import type { NewsletterSource } from '@fellow-owners/shared';
import { and, eq, isNull, lt, or, sql } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { newsletterSubscribers } from '../db/schema/index.js';

export function createNewsletterRepo(db: Db) {
  return {
    /**
     * Records a sign-up and claims the right to send a confirmation email. True when one should go
     * out now: a new row, or one that never confirmed or had unsubscribed (it goes back to pending)
     * and got no confirmation email in the last 24 h. The check and the confirm_sent_at stamp are
     * one statement, so parallel sign-ups for one address send one email. False otherwise.
     */
    async requestOptIn(email: string, source: NewsletterSource): Promise<boolean> {
      const inserted = await db
        .insert(newsletterSubscribers)
        .values({ email, source, confirmSentAt: sql`now()` })
        .onConflictDoNothing()
        .returning({ id: newsletterSubscribers.id });
      if (inserted.length > 0) return true;
      const reset = await db
        .update(newsletterSubscribers)
        .set({ confirmedAt: null, unsubscribedAt: null, confirmSentAt: sql`now()` })
        .where(
          and(
            eq(newsletterSubscribers.email, email),
            or(
              isNull(newsletterSubscribers.confirmedAt),
              sql`${newsletterSubscribers.unsubscribedAt} is not null`,
            ),
            or(
              isNull(newsletterSubscribers.confirmSentAt),
              lt(newsletterSubscribers.confirmSentAt, sql`now() - interval '24 hours'`),
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
