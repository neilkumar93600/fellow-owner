import {
  LIMITS,
  MEDIA_KIT_LIMITS,
  type MediaKitRate,
  type PlatformEntry,
  type TasteProfile,
} from '@fellow-owners/shared';
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
    /** Uploaded cover (/api/media/<key>) or an image link. */
    coverUrl: text('cover_url'),
    /** Pitch Tracker (F31): fans see when their pitch was read. */
    showReadReceipts: boolean('show_read_receipts').notNull().default(true),
    /** Setup checklist: first time the owner copied the bio link (set once). */
    bioLinkSharedAt: timestamptz('bio_link_shared_at'),
    /** F5: the forwarding address <alias>@INBOUND_EMAIL_DOMAIN; null until one is made. */
    inboundEmailAlias: text('inbound_email_alias'),
    /** F6: the public media kit at /{handle}/media-kit. */
    mediaKitEnabled: boolean('media_kit_enabled').notNull().default(false),
    mediaKitRates: jsonb('media_kit_rates').$type<MediaKitRate[]>().notNull().default([]),
    /** F6: the audience note shown to brands. */
    mediaKitNote: text('media_kit_note'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('spaces_handle_uidx').on(t.handle),
    uniqueIndex('spaces_owner_user_id_uidx').on(t.ownerUserId),
    uniqueIndex('spaces_inbound_email_alias_uidx')
      .on(t.inboundEmailAlias)
      .where(sql`${t.inboundEmailAlias} is not null`),
    check(
      'spaces_inbound_email_alias_check',
      sql`${t.inboundEmailAlias} is null or ${t.inboundEmailAlias} ~ '^[a-z0-9][a-z0-9._-]{2,62}$'`,
    ),
    check(
      'spaces_media_kit_rates_check',
      sql`jsonb_typeof(${t.mediaKitRates}) = 'array' and jsonb_array_length(${t.mediaKitRates}) <= ${sql.raw(String(MEDIA_KIT_LIMITS.rates.max))}`,
    ),
    check(
      'spaces_media_kit_note_check',
      sql`${t.mediaKitNote} is null or char_length(${t.mediaKitNote}) <= ${sql.raw(String(MEDIA_KIT_LIMITS.note.max))}`,
    ),
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
