import { LIMITS, type PlatformEntry, type TasteProfile } from '@fellow-owners/shared';
import { sql } from 'drizzle-orm';
import { boolean, check, integer, jsonb, pgTable, text, uniqueIndex } from 'drizzle-orm/pg-core';
import { user } from './auth.js';
import { createdAt, timestamptz, updatedAt, uuidPk } from './columns.js';

export const EMPTY_TASTE_PROFILE: TasteProfile = { promote: [], never: [], voice: [] };

/** A creator's space, reached at /{handle}. One per owner in the MVP. */
export const spaces = pgTable(
  'spaces',
  {
    id: uuidPk(),
    ownerUserId: text('owner_user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    handle: text('handle').notNull(),
    displayName: text('display_name').notNull(),
    bio: text('bio'),
    avatarUrl: text('avatar_url'),
    platforms: jsonb('platforms').$type<PlatformEntry[]>().notNull().default([]),
    tasteProfile: jsonb('taste_profile')
      .$type<TasteProfile>()
      .notNull()
      .default(EMPTY_TASTE_PROFILE),
    tasteVersion: integer('taste_version').notNull().default(1),
    aiDailyTokenBudget: integer('ai_daily_token_budget')
      .notNull()
      .default(LIMITS.ai.defaultDailyTokenBudget),
    isDemo: boolean('is_demo').notNull().default(false),
    /** Uploaded cover (/api/media/<key>) or an image link. */
    coverUrl: text('cover_url'),
    /** Pitch Tracker (F31): fans see when their pitch was read. */
    showReadReceipts: boolean('show_read_receipts').notNull().default(true),
    /** Setup checklist: first time the owner copied the bio link (set once). */
    bioLinkSharedAt: timestamptz('bio_link_shared_at'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('spaces_handle_uidx').on(t.handle),
    uniqueIndex('spaces_owner_user_id_uidx').on(t.ownerUserId),
    check(
      'spaces_handle_check',
      sql`${t.handle} ~ '^[a-z0-9_.]+$' and char_length(${t.handle}) between ${sql.raw(String(LIMITS.handle.min))} and ${sql.raw(String(LIMITS.handle.max))}`,
    ),
    check(
      'spaces_display_name_check',
      sql`char_length(${t.displayName}) between ${sql.raw(String(LIMITS.space.displayName.min))} and ${sql.raw(String(LIMITS.space.displayName.max))}`,
    ),
    check('spaces_taste_version_check', sql`${t.tasteVersion} >= 1`),
    check('spaces_ai_budget_check', sql`${t.aiDailyTokenBudget} >= 0`),
  ],
);

export type SpaceRow = typeof spaces.$inferSelect;
export type NewSpaceRow = typeof spaces.$inferInsert;
