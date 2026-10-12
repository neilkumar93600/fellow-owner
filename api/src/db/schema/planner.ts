import {
  PLAN_ITEM_STATUSES,
  PLANNER_LIMITS,
  PLATFORMS,
  type PlanItemStatus,
  type Platform,
} from '@fellow-owners/shared';
import { sql } from 'drizzle-orm';
import { check, index, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { createdAt, timestamptz, updatedAt, uuidPk } from './columns.js';
import { spaces } from './spaces.js';

// F3 Content planner (creator suite, 0010): plan and remind, never publish.

const L = PLANNER_LIMITS;
const n = (value: number) => sql.raw(String(value));
const inList = (values: readonly string[]) => sql.raw(values.map((v) => `'${v}'`).join(', '));

/** A post the creator plans to publish; the hourly tick reminds them shortly before scheduled_at. */
export const planItems = pgTable(
  'plan_items',
  {
    id: uuidPk(),
    spaceId: uuid('space_id')
      .notNull()
      .references(() => spaces.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    caption: text('caption'),
    platforms: text('platforms').array().$type<Platform[]>().notNull().default(sql`'{}'::text[]`),
    link: text('link'),
    mediaNote: text('media_note'),
    scheduledAt: timestamptz('scheduled_at').notNull(),
    status: text('status').$type<PlanItemStatus>().notNull().default('planned'),
    /** Set once the reminder went out (the job's idempotency mark). */
    remindedAt: timestamptz('reminded_at'),
    /** Set when marked posted or skipped. */
    completedAt: timestamptz('completed_at'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    /** The calendar: a space's items in a time range. */
    index('plan_items_space_scheduled_idx').on(t.spaceId, t.scheduledAt),
    /** The hourly reminder scan across spaces: planned items not yet reminded, by time. */
    index('plan_items_due_idx')
      .on(t.scheduledAt)
      .where(sql`${t.status} = 'planned' and ${t.remindedAt} is null`),
    check(
      'plan_items_title_check',
      sql`char_length(${t.title}) between ${n(L.title.min)} and ${n(L.title.max)}`,
    ),
    check(
      'plan_items_caption_check',
      sql`${t.caption} is null or char_length(${t.caption}) <= ${n(L.caption.max)}`,
    ),
    check(
      'plan_items_media_note_check',
      sql`${t.mediaNote} is null or char_length(${t.mediaNote}) <= ${n(L.mediaNote.max)}`,
    ),
    check('plan_items_link_check', sql`${t.link} is null or char_length(${t.link}) <= 2048`),
    check(
      'plan_items_platforms_check',
      sql`cardinality(${t.platforms}) between ${n(L.platforms.min)} and ${n(L.platforms.max)} and ${t.platforms} <@ array[${inList(PLATFORMS)}]::text[]`,
    ),
    check('plan_items_status_check', sql`${t.status} in (${inList(PLAN_ITEM_STATUSES)})`),
  ],
);

export type PlanItemRow = typeof planItems.$inferSelect;
export type NewPlanItemRow = typeof planItems.$inferInsert;
