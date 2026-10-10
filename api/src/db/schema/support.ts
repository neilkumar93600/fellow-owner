import { LIMITS, SUPPORT_KINDS, type SupportKind } from '@fellow-owners/shared';
import { sql } from 'drizzle-orm';
import { check, index, pgTable, text } from 'drizzle-orm/pg-core';
import { user } from './auth.js';
import { createdAt, uuidPk } from './columns.js';

const S = LIMITS.support;

/** Contact and privacy requests (POST /api/support/requests). Purged after 365 days. */
export const supportRequests = pgTable(
  'support_requests',
  {
    id: uuidPk(),
    kind: text('kind').$type<SupportKind>().notNull(),
    name: text('name'),
    /** Lowercased. */
    email: text('email').notNull(),
    message: text('message').notNull(),
    /** Set when the sender was signed in. */
    userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
    status: text('status').notNull().default('new'),
    createdAt: createdAt(),
  },
  (t) => [
    index('support_requests_created_idx').on(t.createdAt),
    check(
      'support_requests_kind_check',
      sql`${t.kind} in (${sql.raw(SUPPORT_KINDS.map((v) => `'${v}'`).join(', '))})`,
    ),
    check(
      'support_requests_message_check',
      sql`char_length(${t.message}) between ${sql.raw(String(S.messageMin))} and ${sql.raw(String(S.messageMax))}`,
    ),
  ],
);

export type SupportRequestRow = typeof supportRequests.$inferSelect;
export type NewSupportRequestRow = typeof supportRequests.$inferInsert;
