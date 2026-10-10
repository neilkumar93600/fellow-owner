import { boolean, index, pgTable, text } from 'drizzle-orm/pg-core';
import { timestamptz } from './columns.js';

// Better Auth 1.7 core tables (user, session, account, verification), generated with the
// drizzle adapter's schema generator for `provider: 'pg'` with the emailOTP plugin (no tables of
// its own) and the username plugin (`user.username`), plus the two `user.additionalFields` from
// auth/index.ts (the optional social profile). The only change from the generated file:
// timestamps are timestamptz (05: all timestamps are timestamptz). Property names are what
// Better Auth reads; keep them as they are. Better Auth checks this object against its config on
// first use, so a field added there needs its column here (and a migration).
// Our foreign keys to these tables are `text` (Better Auth generates string ids).

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  image: text('image'),
  createdAt: timestamptz('created_at').defaultNow().notNull(),
  updatedAt: timestamptz('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
  /** Trimmed and lowercased by the username plugin. Null on accounts made without one (social, demo). */
  username: text('username').unique(),
  socialPlatform: text('social_platform'),
  socialHandle: text('social_handle'),
});

export const session = pgTable(
  'session',
  {
    id: text('id').primaryKey(),
    expiresAt: timestamptz('expires_at').notNull(),
    token: text('token').notNull().unique(),
    createdAt: timestamptz('created_at').defaultNow().notNull(),
    updatedAt: timestamptz('updated_at')
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (table) => [index('session_userId_idx').on(table.userId)],
);

export const account = pgTable(
  'account',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamptz('access_token_expires_at'),
    refreshTokenExpiresAt: timestamptz('refresh_token_expires_at'),
    scope: text('scope'),
    password: text('password'),
    createdAt: timestamptz('created_at').defaultNow().notNull(),
    updatedAt: timestamptz('updated_at')
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index('account_userId_idx').on(table.userId)],
);

export const verification = pgTable(
  'verification',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamptz('expires_at').notNull(),
    createdAt: timestamptz('created_at').defaultNow().notNull(),
    updatedAt: timestamptz('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index('verification_identifier_idx').on(table.identifier)],
);

export type UserRow = typeof user.$inferSelect;
export type NewUserRow = typeof user.$inferInsert;
export type SessionRow = typeof session.$inferSelect;
export type AccountRow = typeof account.$inferSelect;
