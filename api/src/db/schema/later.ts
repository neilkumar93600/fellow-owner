import { LIMITS, NOTIFICATION_KINDS } from '@fellow-owners/shared';
import { sql } from 'drizzle-orm';
import { check, index, integer, jsonb, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { user } from './auth.js';
import { createdAt, timestamptz, uuidPk } from './columns.js';
import { communities } from './communities.js';
import { spaces } from './spaces.js';

// P1 tables (05 §2 "P1 tables"). Created now so the P1 features need no destructive migration.
// Their small status vocabularies are text + CHECK rather than Postgres enums.

export const ASK_STATUSES = ['open', 'closed'] as const;
export const IMPORT_SOURCES = ['paste', 'csv', 'youtube'] as const;
export const IMPORT_STATUSES = ['pending', 'done', 'failed'] as const;

const inList = (values: readonly string[]) => sql.raw(values.map((v) => `'${v}'`).join(', '));

/** Creator asks (P1). community_id null = all communities. */
export const asks = pgTable(
  'asks',
  {
    id: uuidPk(),
    spaceId: uuid('space_id')
      .notNull()
      .references(() => spaces.id, { onDelete: 'cascade' }),
    communityId: uuid('community_id').references(() => communities.id, { onDelete: 'set null' }),
    title: text('title').notNull(),
    body: text('body'),
    dueAt: timestamptz('due_at'),
    status: text('status').$type<(typeof ASK_STATUSES)[number]>().notNull().default('open'),
    responseSummary: jsonb('response_summary').$type<Record<string, unknown>>(),
    createdAt: createdAt(),
  },
  (t) => [
    index('asks_space_created_idx').on(t.spaceId, t.createdAt.desc().nullsFirst()),
    check(
      'asks_title_check',
      sql`char_length(${t.title}) between ${sql.raw(String(LIMITS.post.title.min))} and ${sql.raw(String(LIMITS.post.title.max))}`,
    ),
    check('asks_body_check', sql`${t.body} is null or char_length(${t.body}) <= 2000`),
    check('asks_status_check', sql`${t.status} in (${inList(ASK_STATUSES)})`),
  ],
);

/** In-app notifications (P1). */
export const notifications = pgTable(
  'notifications',
  {
    id: uuidPk(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    spaceId: uuid('space_id')
      .notNull()
      .references(() => spaces.id, { onDelete: 'cascade' }),
    /** NOTIFICATION_KINDS from @fellow-owners/shared (one list for api and web). */
    kind: text('kind').$type<(typeof NOTIFICATION_KINDS)[number]>().notNull(),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull().default({}),
    readAt: timestamptz('read_at'),
    createdAt: createdAt(),
  },
  (t) => [
    index('notifications_user_read_created_idx').on(
      t.userId,
      t.readAt,
      t.createdAt.desc().nullsFirst(),
    ),
    check('notifications_kind_check', sql`${t.kind} in (${inList(NOTIFICATION_KINDS)})`),
  ],
);

/** Audience imports (P1). */
export const imports = pgTable(
  'imports',
  {
    id: uuidPk(),
    spaceId: uuid('space_id')
      .notNull()
      .references(() => spaces.id, { onDelete: 'cascade' }),
    source: text('source').$type<(typeof IMPORT_SOURCES)[number]>().notNull(),
    status: text('status').$type<(typeof IMPORT_STATUSES)[number]>().notNull().default('pending'),
    itemCount: integer('item_count').notNull().default(0),
    result: jsonb('result').$type<Record<string, unknown>>(),
    createdAt: createdAt(),
  },
  (t) => [
    index('imports_space_created_idx').on(t.spaceId, t.createdAt.desc().nullsFirst()),
    check('imports_source_check', sql`${t.source} in (${inList(IMPORT_SOURCES)})`),
    check('imports_status_check', sql`${t.status} in (${inList(IMPORT_STATUSES)})`),
  ],
);

export type AskRow = typeof asks.$inferSelect;
export type NotificationRow = typeof notifications.$inferSelect;
export type NewNotificationRow = typeof notifications.$inferInsert;
export type ImportRow = typeof imports.$inferSelect;
export type NewImportRow = typeof imports.$inferInsert;
