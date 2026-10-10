import {
  FOLLOWER_SOURCES,
  FOLLOWER_TAGGERS,
  type FollowerSource,
  type FollowerTagger,
  LIMITS,
  PLATFORMS,
  type Platform,
} from '@fellow-owners/shared';
import { sql } from 'drizzle-orm';
import { check, index, pgTable, primaryKey, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { createdAt, timestamptz, uuidPk } from './columns.js';
import { communities } from './communities.js';
import { imports } from './later.js';
import { memberships } from './memberships.js';
import { spaces } from './spaces.js';

const F = LIMITS.follower;
const inList = (values: readonly string[]) => sql.raw(values.map((v) => `'${v}'`).join(', '));
const n = (value: number) => sql.raw(String(value));

/**
 * The creator's follower roster (F23): people imported from CSV or pasted lines, or added by hand,
 * before (or without) joining the space. Tagged into communities by the creator or the AI.
 * `membership_id` links the follower once they join. Owner-only data: emails never leave studio.
 */
export const followers = pgTable(
  'followers',
  {
    id: uuidPk(),
    spaceId: uuid('space_id')
      .notNull()
      .references(() => spaces.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    /** Stored without the leading @. */
    handle: text('handle'),
    platform: text('platform').$type<Platform>(),
    /** Lowercased. */
    email: text('email'),
    /** What they said (a comment, bio or DM excerpt); the AI tags from it. */
    note: text('note'),
    source: text('source').$type<FollowerSource>().notNull().default('manual'),
    importId: uuid('import_id').references(() => imports.id, { onDelete: 'set null' }),
    membershipId: uuid('membership_id').references(() => memberships.id, {
      onDelete: 'set null',
    }),
    /** Last time auto-tag sent this follower to the model (skipped until communities change). */
    aiTaggedAt: timestamptz('ai_tagged_at'),
    createdAt: createdAt(),
  },
  (t) => [
    index('followers_import_idx').on(t.importId),
    index('followers_space_created_idx').on(t.spaceId, t.createdAt.desc().nullsFirst()),
    uniqueIndex('followers_space_email_uidx')
      .on(t.spaceId, t.email)
      .where(sql`${t.email} is not null`),
    uniqueIndex('followers_space_platform_handle_uidx')
      .on(t.spaceId, sql`coalesce(${t.platform}, '')`, sql`lower(${t.handle})`)
      .where(sql`${t.handle} is not null`),
    uniqueIndex('followers_membership_uidx')
      .on(t.membershipId)
      .where(sql`${t.membershipId} is not null`),
    check(
      'followers_name_check',
      sql`char_length(${t.name}) between ${n(F.name.min)} and ${n(F.name.max)}`,
    ),
    check(
      'followers_handle_check',
      sql`${t.handle} is null or char_length(${t.handle}) between 1 and ${n(F.handle.max)}`,
    ),
    check(
      'followers_email_check',
      sql`${t.email} is null or (char_length(${t.email}) <= ${n(F.email.max)} and ${t.email} = lower(${t.email}))`,
    ),
    check(
      'followers_note_check',
      sql`${t.note} is null or char_length(${t.note}) <= ${n(F.note.max)}`,
    ),
    check(
      'followers_platform_check',
      sql`${t.platform} is null or ${t.platform} in (${inList(PLATFORMS)})`,
    ),
    check('followers_source_check', sql`${t.source} in (${inList(FOLLOWER_SOURCES)})`),
  ],
);

/** Which communities a follower is tagged into. */
export const followerCommunities = pgTable(
  'follower_communities',
  {
    followerId: uuid('follower_id')
      .notNull()
      .references(() => followers.id, { onDelete: 'cascade' }),
    communityId: uuid('community_id')
      .notNull()
      .references(() => communities.id, { onDelete: 'cascade' }),
    taggedBy: text('tagged_by').$type<FollowerTagger>().notNull().default('creator'),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ name: 'follower_communities_pk', columns: [t.followerId, t.communityId] }),
    index('follower_communities_community_idx').on(t.communityId),
    check(
      'follower_communities_tagged_by_check',
      sql`${t.taggedBy} in (${inList(FOLLOWER_TAGGERS)})`,
    ),
  ],
);

export type FollowerRow = typeof followers.$inferSelect;
export type NewFollowerRow = typeof followers.$inferInsert;
export type FollowerCommunityRow = typeof followerCommunities.$inferSelect;
export type NewFollowerCommunityRow = typeof followerCommunities.$inferInsert;
