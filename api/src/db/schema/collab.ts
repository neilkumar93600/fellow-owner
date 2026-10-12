import { COLLAB_LIMITS } from '@fellow-owners/shared';
import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  foreignKey,
  index,
  pgTable,
  primaryKey,
  smallint,
  text,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { createdAt, timestamptz, uuidPk } from './columns.js';
import { memberships } from './memberships.js';
import { posts } from './posts.js';
import { spaces } from './spaces.js';

// F4 Fan collaboration (creator suite, 0010): polls on posts, project updates, follows. The
// "feedback wanted" and "backed" flags are columns on posts. Every row carries space_id (RLS-ready).

const C = COLLAB_LIMITS;
const n = (value: number) => sql.raw(String(value));

/** One poll per post, added by the post author. */
export const polls = pgTable(
  'polls',
  {
    id: uuidPk(),
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    spaceId: uuid('space_id')
      .notNull()
      .references(() => spaces.id, { onDelete: 'cascade' }),
    /** Null once the author's membership is deleted. */
    createdByMembershipId: uuid('created_by_membership_id').references(() => memberships.id, {
      onDelete: 'set null',
    }),
    question: text('question').notNull(),
    /** Voters may pick more than one option. */
    multi: boolean('multi').notNull().default(false),
    closesAt: timestamptz('closes_at'),
    /** Closed early by the post author or the space owner. */
    closedAt: timestamptz('closed_at'),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('polls_post_uidx').on(t.postId),
    index('polls_space_idx').on(t.spaceId),
    check(
      'polls_question_check',
      sql`char_length(${t.question}) between ${n(C.poll.question.min)} and ${n(C.poll.question.max)}`,
    ),
  ],
);

/** A poll's options, 2 to 6, in `position` order. */
export const pollOptions = pgTable(
  'poll_options',
  {
    id: uuidPk(),
    pollId: uuid('poll_id')
      .notNull()
      .references(() => polls.id, { onDelete: 'cascade' }),
    spaceId: uuid('space_id')
      .notNull()
      .references(() => spaces.id, { onDelete: 'cascade' }),
    label: text('label').notNull(),
    position: smallint('position').notNull(),
  },
  (t) => [
    uniqueIndex('poll_options_poll_position_uidx').on(t.pollId, t.position),
    /** Target of poll_votes' (poll_id, option_id) foreign key: a constraint, so it exists first. */
    unique('poll_options_poll_id_unique').on(t.pollId, t.id),
    check(
      'poll_options_label_check',
      sql`char_length(${t.label}) between ${n(C.poll.optionLabel.min)} and ${n(C.poll.optionLabel.max)}`,
    ),
    check(
      'poll_options_position_check',
      sql`${t.position} between 0 and ${n(C.poll.options.max - 1)}`,
    ),
  ],
);

/**
 * One row per option per voter (a multi-choice vote is several rows). The (poll_id, option_id)
 * foreign key keeps every vote's option inside its poll; single choice is enforced by the service.
 */
export const pollVotes = pgTable(
  'poll_votes',
  {
    pollId: uuid('poll_id').notNull(),
    optionId: uuid('option_id').notNull(),
    membershipId: uuid('membership_id')
      .notNull()
      .references(() => memberships.id, { onDelete: 'cascade' }),
    spaceId: uuid('space_id')
      .notNull()
      .references(() => spaces.id, { onDelete: 'cascade' }),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ name: 'poll_votes_pk', columns: [t.optionId, t.membershipId] }),
    foreignKey({
      name: 'poll_votes_option_fk',
      columns: [t.pollId, t.optionId],
      foreignColumns: [pollOptions.pollId, pollOptions.id],
    }).onDelete('cascade'),
    /** Has this member voted, and their choices. */
    index('poll_votes_poll_membership_idx').on(t.pollId, t.membershipId),
    index('poll_votes_membership_idx').on(t.membershipId),
  ],
);

/** A project's updates timeline: the author and accepted team members post. */
export const projectUpdates = pgTable(
  'project_updates',
  {
    id: uuidPk(),
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    spaceId: uuid('space_id')
      .notNull()
      .references(() => spaces.id, { onDelete: 'cascade' }),
    /** Null once the author's membership is deleted ("Former member"). */
    authorMembershipId: uuid('author_membership_id').references(() => memberships.id, {
      onDelete: 'set null',
    }),
    body: text('body').notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    /** The timeline, newest first, keyset on (created_at, id). */
    index('project_updates_post_created_idx').on(
      t.postId,
      t.createdAt.desc().nullsFirst(),
      t.id.desc().nullsFirst(),
    ),
    /** Daily caps per author. */
    index('project_updates_author_created_idx').on(t.authorMembershipId, t.createdAt),
    index('project_updates_space_idx').on(t.spaceId),
    check(
      'project_updates_body_check',
      sql`char_length(${t.body}) between ${n(C.update.body.min)} and ${n(C.update.body.max)}`,
    ),
  ],
);

/** Members who follow a project's updates (project_updated notifications). */
export const postFollows = pgTable(
  'post_follows',
  {
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    membershipId: uuid('membership_id')
      .notNull()
      .references(() => memberships.id, { onDelete: 'cascade' }),
    spaceId: uuid('space_id')
      .notNull()
      .references(() => spaces.id, { onDelete: 'cascade' }),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ name: 'post_follows_pk', columns: [t.postId, t.membershipId] }),
    index('post_follows_membership_idx').on(t.membershipId),
    index('post_follows_space_idx').on(t.spaceId),
  ],
);

export type PollRow = typeof polls.$inferSelect;
export type NewPollRow = typeof polls.$inferInsert;
export type PollOptionRow = typeof pollOptions.$inferSelect;
export type NewPollOptionRow = typeof pollOptions.$inferInsert;
export type PollVoteRow = typeof pollVotes.$inferSelect;
export type NewPollVoteRow = typeof pollVotes.$inferInsert;
export type ProjectUpdateRow = typeof projectUpdates.$inferSelect;
export type NewProjectUpdateRow = typeof projectUpdates.$inferInsert;
export type PostFollowRow = typeof postFollows.$inferSelect;
export type NewPostFollowRow = typeof postFollows.$inferInsert;
