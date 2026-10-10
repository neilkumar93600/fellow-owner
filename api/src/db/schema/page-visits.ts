import { sql } from 'drizzle-orm';
import { check, date, integer, pgTable, primaryKey, text, uuid } from 'drizzle-orm/pg-core';
import { spaces } from './spaces.js';

/**
 * Bio-page visits for pilot analytics: one row per hashed visitor per space per UTC day
 * (visitor_hash is salted like click_events; the raw IP is never stored). Purged after 400 days.
 */
export const pageVisits = pgTable(
  'page_visits',
  {
    spaceId: uuid('space_id')
      .notNull()
      .references(() => spaces.id, { onDelete: 'cascade' }),
    visitorHash: text('visitor_hash').notNull(),
    /** UTC day, `YYYY-MM-DD`. */
    day: date('day', { mode: 'string' }).notNull(),
    visits: integer('visits').notNull().default(1),
  },
  (t) => [
    primaryKey({ name: 'page_visits_pk', columns: [t.spaceId, t.visitorHash, t.day] }),
    check('page_visits_visits_check', sql`${t.visits} >= 1`),
  ],
);

export type PageVisitRow = typeof pageVisits.$inferSelect;
export type NewPageVisitRow = typeof pageVisits.$inferInsert;
