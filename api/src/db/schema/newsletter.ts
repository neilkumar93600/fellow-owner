import type { NewsletterSource } from '@fellow-owners/shared';
import { pgTable, text, uniqueIndex } from 'drizzle-orm/pg-core';
import { createdAt, timestamptz, uuidPk } from './columns.js';

/** Landing-page newsletter sign-ups. Email only (trimmed, lowercased); nothing is mailed yet. */
export const newsletterSubscribers = pgTable(
  'newsletter_subscribers',
  {
    id: uuidPk(),
    email: text('email').notNull(),
    source: text('source').$type<NewsletterSource>().notNull().default('footer'),
    createdAt: createdAt(),
    unsubscribedAt: timestamptz('unsubscribed_at'),
  },
  (t) => [uniqueIndex('newsletter_subscribers_email_key').on(t.email)],
);
