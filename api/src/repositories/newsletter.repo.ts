import type { NewsletterSource } from '@fellow-owners/shared';
import { and, eq, isNull, lt, or, sql } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { newsletterSubscribers } from '../db/schema/index.js';

export function createNewsletterRepo(db: Db) {
  return {
    /**
     * Records a sign-up and claims the right to send a confirmation email. True when one should go
     * out now: a new row, or one that never confirmed or had unsubscribed and got no confirmation
     * email in the last 24 h. The check and the confirm_sent_at stamp are one statement, so
     * parallel sign-ups for one address send one email. An unsubscribe stays recorded: only the
     * signed confirm (confirm()) lifts it. False otherwise.
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
        .set({ confirmSentAt: sql`now()` })
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

    /** Gives back a requestOptIn claim when no email went out, so a retry can send at once. */
    async releaseOptIn(email: string): Promise<void> {
      await db
        .update(newsletterSubscribers)
        .set({ confirmSentAt: null })
        .where(eq(newsletterSubscribers.email, email));
    },

    /**
     * Stamps confirmed_at once. An address that has since unsubscribed stays unsubscribed, unless
     * it asked again after the unsubscribe (confirm_sent_at is later): then it is subscribed anew.
     */
    async confirm(email: string): Promise<void> {
      const { confirmedAt, unsubscribedAt, confirmSentAt } = newsletterSubscribers;
      await db
        .update(newsletterSubscribers)
        .set({
          confirmedAt: sql`case when ${unsubscribedAt} is null then coalesce(${confirmedAt}, now()) else now() end`,
          unsubscribedAt: null,
        })
        .where(
          and(
            eq(newsletterSubscribers.email, email),
            or(isNull(unsubscribedAt), sql`${confirmSentAt} > ${unsubscribedAt}`),
          ),
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
