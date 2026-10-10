import {
  CLICK_PLATFORMS,
  type ClickPlatform,
  type PromotionDrafts,
  type PromotionPlatform,
} from '@fellow-owners/shared';
import { sql } from 'drizzle-orm';
import {
  bigserial,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { user } from './auth.js';
import { createdAt, timestamptz, updatedAt, uuidPk } from './columns.js';
import { posts } from './posts.js';
import { spaces } from './spaces.js';

/**
 * A creator promoting a post: drafts, showcase, short link. One per post.
 * State: draft (published_at null), live (published, not unpublished), unpublished.
 */
export const promotions = pgTable(
  'promotions',
  {
    id: uuidPk(),
    spaceId: uuid('space_id')
      .notNull()
      .references(() => spaces.id, { onDelete: 'cascade' }),
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    headline: text('headline'),
    drafts: jsonb('drafts').$type<PromotionDrafts>().notNull().default({}),
    /** Platforms the AI could not draft last time (shown as "Couldn't draft" + Retry). */
    draftErrors: text('draft_errors')
      .array()
      .$type<PromotionPlatform[]>()
      .notNull()
      .default(sql`'{}'::text[]`),
    /** Set on first publish; unique per space. */
    showcaseSlug: text('showcase_slug'),
    /** 8-char base62, set on first publish; globally unique. */
    shortCode: text('short_code'),
    clickCount: integer('click_count').notNull().default(0),
    publishedAt: timestamptz('published_at'),
    unpublishedAt: timestamptz('unpublished_at'),
    createdByUserId: text('created_by_user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('promotions_post_uidx').on(t.postId),
    uniqueIndex('promotions_space_showcase_slug_uidx').on(t.spaceId, t.showcaseSlug),
    uniqueIndex('promotions_short_code_uidx').on(t.shortCode),
    index('promotions_space_created_idx').on(t.spaceId, t.createdAt.desc().nullsFirst()),
    check('promotions_click_count_check', sql`${t.clickCount} >= 0`),
  ],
);

/** Clicks through a promotion's short link. The raw IP is never stored. */
export const clickEvents = pgTable(
  'click_events',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    promotionId: uuid('promotion_id')
      .notNull()
      .references(() => promotions.id, { onDelete: 'cascade' }),
    platform: text('platform').$type<ClickPlatform>().notNull().default('other'),
    /** Host only, no path. */
    referrerHost: text('referrer_host'),
    /** sha256(ip + user agent + UTC day + secret salt), for unique counts. */
    visitorHash: text('visitor_hash'),
    createdAt: createdAt(),
  },
  (t) => [
    index('click_events_promotion_created_idx').on(t.promotionId, t.createdAt),
    index('click_events_created_idx').on(t.createdAt),
    check(
      'click_events_platform_check',
      sql`${t.platform} in (${sql.raw(CLICK_PLATFORMS.map((p) => `'${p}'`).join(', '))})`,
    ),
  ],
);

export type PromotionRow = typeof promotions.$inferSelect;
export type NewPromotionRow = typeof promotions.$inferInsert;
export type ClickEventRow = typeof clickEvents.$inferSelect;
export type NewClickEventRow = typeof clickEvents.$inferInsert;
