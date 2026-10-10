import { SNOOZE_REF_TYPES, type SnoozeRefType } from '@fellow-owners/shared';
import { sql } from 'drizzle-orm';
import { check, pgTable, primaryKey, text, uuid } from 'drizzle-orm/pg-core';
import { timestamptz } from './columns.js';
import { spaces } from './spaces.js';

/** Today "Later": a pitch or post hidden from the decision cards until `until`. */
export const studioSnoozes = pgTable(
  'studio_snoozes',
  {
    spaceId: uuid('space_id')
      .notNull()
      .references(() => spaces.id, { onDelete: 'cascade' }),
    refType: text('ref_type').$type<SnoozeRefType>().notNull(),
    /** inbound.id or posts.id. */
    refId: uuid('ref_id').notNull(),
    until: timestamptz('until').notNull(),
  },
  (t) => [
    primaryKey({ name: 'studio_snoozes_pk', columns: [t.spaceId, t.refType, t.refId] }),
    check(
      'studio_snoozes_ref_type_check',
      sql`${t.refType} in (${sql.raw(SNOOZE_REF_TYPES.map((v) => `'${v}'`).join(', '))})`,
    ),
  ],
);

export type StudioSnoozeRow = typeof studioSnoozes.$inferSelect;
export type NewStudioSnoozeRow = typeof studioSnoozes.$inferInsert;
