import { LIMITS } from '@fellow-owners/shared';
import { sql } from 'drizzle-orm';
import { check, index, pgTable, primaryKey, text, uuid } from 'drizzle-orm/pg-core';
import { createdAt, timestamptz, uuidPk } from './columns.js';
import { signalKindEnum, teamStatusEnum } from './enums.js';
import { memberships } from './memberships.js';
import { posts } from './posts.js';
import { spaces } from './spaces.js';

/** Replies on posts. comment_count on posts is kept in sync in the same transaction. */
export const comments = pgTable(
  'comments',
  {
    id: uuidPk(),
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    /** Denormalized for scoping and daily caps. */
    spaceId: uuid('space_id')
      .notNull()
      .references(() => spaces.id, { onDelete: 'cascade' }),
    authorMembershipId: uuid('author_membership_id').references(() => memberships.id, {
      onDelete: 'set null',
    }),
    body: text('body').notNull(),
    hiddenAt: timestamptz('hidden_at'),
    deletedAt: timestamptz('deleted_at'),
    createdAt: createdAt(),
  },
  (t) => [
    index('comments_post_created_idx').on(t.postId, t.createdAt),
    index('comments_author_created_idx').on(t.authorMembershipId, t.createdAt),
    index('comments_deleted_idx').on(t.deletedAt).where(sql`${t.deletedAt} is not null`),
    check(
      'comments_body_check',
      sql`char_length(${t.body}) between ${sql.raw(String(LIMITS.comment.body.min))} and ${sql.raw(String(LIMITS.comment.body.max))}`,
    ),
  ],
);

/** "I'd use this" / "I'd help build". use_count / build_count on posts stay in sync. */
export const signals = pgTable(
  'signals',
  {
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    membershipId: uuid('membership_id')
      .notNull()
      .references(() => memberships.id, { onDelete: 'cascade' }),
    kind: signalKindEnum('kind').notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ name: 'signals_pk', columns: [t.postId, t.membershipId, t.kind] }),
    index('signals_membership_idx').on(t.membershipId),
  ],
);

/** Members on a project team, by role. The project author is `Lead`, `accepted`. */
export const teamMembers = pgTable(
  'team_members',
  {
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    membershipId: uuid('membership_id')
      .notNull()
      .references(() => memberships.id, { onDelete: 'cascade' }),
    role: text('role').notNull(),
    status: teamStatusEnum('status').notNull().default('requested'),
    createdAt: createdAt(),
    decidedAt: timestamptz('decided_at'),
  },
  (t) => [
    primaryKey({ name: 'team_members_pk', columns: [t.postId, t.membershipId] }),
    index('team_members_post_status_idx').on(t.postId, t.status),
    index('team_members_membership_idx').on(t.membershipId, t.createdAt),
    check(
      'team_members_role_check',
      sql`char_length(${t.role}) between ${sql.raw(String(LIMITS.post.rolesNeeded.itemMin))} and ${sql.raw(String(LIMITS.post.rolesNeeded.itemMax))}`,
    ),
  ],
);

/** Role name used for the project author on their own team. */
export const LEAD_ROLE = 'Lead';

export type CommentRow = typeof comments.$inferSelect;
export type NewCommentRow = typeof comments.$inferInsert;
export type SignalRow = typeof signals.$inferSelect;
export type NewSignalRow = typeof signals.$inferInsert;
export type TeamMemberRow = typeof teamMembers.$inferSelect;
export type NewTeamMemberRow = typeof teamMembers.$inferInsert;
