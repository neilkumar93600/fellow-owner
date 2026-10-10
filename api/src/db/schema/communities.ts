import { type CommunityIcon, LIMITS } from '@fellow-owners/shared';
import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { createdAt, timestamptz, uuidPk } from './columns.js';
import { tintEnum } from './enums.js';
import { memberships } from './memberships.js';
import { spaces } from './spaces.js';

const C = LIMITS.community;

/** Interest groups inside a space. Archived, never deleted. */
export const communities = pgTable(
  'communities',
  {
    id: uuidPk(),
    spaceId: uuid('space_id')
      .notNull()
      .references(() => spaces.id, { onDelete: 'cascade' }),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    tint: tintEnum('tint').notNull().default('white'),
    icon: text('icon').$type<CommunityIcon>().notNull().default('users'),
    sortOrder: integer('sort_order').notNull().default(0),
    /** Updated in the same transaction as joins and leaves (community_members). */
    memberCount: integer('member_count').notNull().default(0),
    archivedAt: timestamptz('archived_at'),
    /** Uploaded cover (/api/media/<key>) or an image link. */
    coverUrl: text('cover_url'),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('communities_space_slug_uidx').on(t.spaceId, t.slug),
    index('communities_space_sort_idx').on(t.spaceId, t.sortOrder),
    check(
      'communities_slug_check',
      sql`${t.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(${t.slug}) between ${sql.raw(String(C.slug.min))} and ${sql.raw(String(C.slug.max))}`,
    ),
    check(
      'communities_name_check',
      sql`char_length(${t.name}) between ${sql.raw(String(C.name.min))} and ${sql.raw(String(C.name.max))}`,
    ),
    check('communities_member_count_check', sql`${t.memberCount} >= 0`),
  ],
);

/** Which communities a membership has joined. */
export const communityMembers = pgTable(
  'community_members',
  {
    communityId: uuid('community_id')
      .notNull()
      .references(() => communities.id, { onDelete: 'cascade' }),
    membershipId: uuid('membership_id')
      .notNull()
      .references(() => memberships.id, { onDelete: 'cascade' }),
    joinedAt: timestamptz('joined_at').notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ name: 'community_members_pk', columns: [t.communityId, t.membershipId] }),
    index('community_members_membership_idx').on(t.membershipId),
  ],
);

export type CommunityRow = typeof communities.$inferSelect;
export type NewCommunityRow = typeof communities.$inferInsert;
export type CommunityMemberRow = typeof communityMembers.$inferSelect;
export type NewCommunityMemberRow = typeof communityMembers.$inferInsert;
