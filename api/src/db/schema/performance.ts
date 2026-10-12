import {
  METRIC_SOURCES,
  type MetricSource,
  PERFORMANCE_LIMITS,
  PLATFORMS,
  type Platform,
} from '@fellow-owners/shared';
import { sql } from 'drizzle-orm';
import {
  bigint,
  check,
  date,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { createdAt, timestamptz, uuidPk } from './columns.js';
import { spaces } from './spaces.js';

// F1 Post performance (creator suite, 0010). Written by the daily refresh (tick
// `refresh_performance`); read by the Performance page, the profile score, best times and the
// media kit. Owner-only data: every row carries space_id (RLS-ready).

const inList = (values: readonly string[]) => sql.raw(values.map((v) => `'${v}'`).join(', '));

/** One follower count per linked profile per UTC day (live fetch, the creator's count, or sample). */
export const platformSnapshots = pgTable(
  'platform_snapshots',
  {
    spaceId: uuid('space_id')
      .notNull()
      .references(() => spaces.id, { onDelete: 'cascade' }),
    platform: text('platform').$type<Platform>().notNull(),
    /** The linked profile: spaces.platforms[].url. */
    profileUrl: text('profile_url').notNull(),
    handle: text('handle'),
    /** UTC day, `YYYY-MM-DD`. */
    day: date('day', { mode: 'string' }).notNull(),
    followers: integer('followers').notNull(),
    source: text('source').$type<MetricSource>().notNull().default('live'),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ name: 'platform_snapshots_pk', columns: [t.spaceId, t.profileUrl, t.day] }),
    /** A space's series over a day range. */
    index('platform_snapshots_space_day_idx').on(t.spaceId, t.day),
    check('platform_snapshots_platform_check', sql`${t.platform} in (${inList(PLATFORMS)})`),
    check('platform_snapshots_source_check', sql`${t.source} in (${inList(METRIC_SOURCES)})`),
    check('platform_snapshots_followers_check', sql`${t.followers} >= 0`),
  ],
);

/**
 * Recent posts of a linked profile with their public metrics, upserted on
 * (space_id, platform, external_id) at each refresh.
 */
export const platformPosts = pgTable(
  'platform_posts',
  {
    id: uuidPk(),
    spaceId: uuid('space_id')
      .notNull()
      .references(() => spaces.id, { onDelete: 'cascade' }),
    platform: text('platform').$type<Platform>().notNull(),
    profileUrl: text('profile_url').notNull(),
    /** The platform's id for the post, else its URL: the upsert key with space and platform. */
    externalId: text('external_id').notNull(),
    url: text('url').notNull(),
    /** Title or caption, cut to PERFORMANCE_LIMITS.postTitleMax. */
    title: text('title').notNull().default(''),
    postedAt: timestamptz('posted_at'),
    views: bigint('views', { mode: 'number' }),
    likes: bigint('likes', { mode: 'number' }),
    comments: bigint('comments', { mode: 'number' }),
    source: text('source').$type<MetricSource>().notNull().default('live'),
    /** Last time the metrics were read. */
    fetchedAt: timestamptz('fetched_at').notNull().defaultNow(),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('platform_posts_space_platform_external_uidx').on(
      t.spaceId,
      t.platform,
      t.externalId,
    ),
    /** Recent and top posts of a space; best day/hour from posted_at. */
    index('platform_posts_space_posted_idx').on(t.spaceId, t.postedAt),
    check('platform_posts_platform_check', sql`${t.platform} in (${inList(PLATFORMS)})`),
    check('platform_posts_source_check', sql`${t.source} in (${inList(METRIC_SOURCES)})`),
    check(
      'platform_posts_title_check',
      sql`char_length(${t.title}) <= ${sql.raw(String(PERFORMANCE_LIMITS.postTitleMax))}`,
    ),
    check(
      'platform_posts_counts_check',
      sql`coalesce(${t.views}, 0) >= 0 and coalesce(${t.likes}, 0) >= 0 and coalesce(${t.comments}, 0) >= 0`,
    ),
  ],
);

export type PlatformSnapshotRow = typeof platformSnapshots.$inferSelect;
export type NewPlatformSnapshotRow = typeof platformSnapshots.$inferInsert;
export type PlatformPostRow = typeof platformPosts.$inferSelect;
export type NewPlatformPostRow = typeof platformPosts.$inferInsert;
