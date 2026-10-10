import { LIMITS, type LinkItem } from '@fellow-owners/shared';
import { sql } from 'drizzle-orm';
import {
  type AnyPgColumn,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  uuid,
} from 'drizzle-orm/pg-core';
import { aiFields, createdAt, timestamptz, updatedAt, uuidPk } from './columns.js';
import { communities } from './communities.js';
import { postStatusEnum, postTypeEnum } from './enums.js';
import { asks } from './later.js';
import { memberships } from './memberships.js';
import { questionGroups } from './question-groups.js';
import { spaces } from './spaces.js';

const P = LIMITS.post;

/** Ideas, projects and discussions inside a community. */
export const posts = pgTable(
  'posts',
  {
    id: uuidPk(),
    spaceId: uuid('space_id')
      .notNull()
      .references(() => spaces.id, { onDelete: 'cascade' }),
    communityId: uuid('community_id')
      .notNull()
      .references(() => communities.id),
    /** Null once the author's membership is deleted ("Former member"). */
    authorMembershipId: uuid('author_membership_id').references(() => memberships.id, {
      onDelete: 'set null',
    }),
    /** The creator challenge (ask) this post is an entry to. */
    askId: uuid('ask_id').references(() => asks.id, { onDelete: 'set null' }),
    /** F32: a pinned Answer Once answer post (one per chosen community). */
    questionGroupId: uuid('question_group_id').references((): AnyPgColumn => questionGroups.id, {
      onDelete: 'set null',
    }),
    type: postTypeEnum('type').notNull(),
    title: text('title').notNull(),
    body: text('body').notNull(),
    status: postStatusEnum('status').notNull().default('open'),
    rolesNeeded: text('roles_needed').array().notNull().default(sql`'{}'::text[]`),
    links: jsonb('links').$type<LinkItem[]>().notNull().default([]),
    useCount: integer('use_count').notNull().default(0),
    buildCount: integer('build_count').notNull().default(0),
    commentCount: integer('comment_count').notNull().default(0),
    /** Set while a promotion of this post is published. */
    featuredAt: timestamptz('featured_at'),
    /** Set by the space owner: "Loved by {creator}". */
    lovedAt: timestamptz('loved_at'),
    /** Set by the space owner. */
    hiddenAt: timestamptz('hidden_at'),
    /** Soft delete by the author; hard-deleted after 30 days. */
    deletedAt: timestamptz('deleted_at'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    ...aiFields(),
  },
  (t) => [
    index('posts_community_created_idx')
      .on(t.communityId, t.createdAt.desc().nullsFirst())
      .where(sql`${t.deletedAt} is null`),
    index('posts_space_created_idx').on(t.spaceId, t.createdAt.desc().nullsFirst()),
    index('posts_space_fit_idx')
      .on(t.spaceId, t.aiFitScore.desc())
      .where(sql`${t.analysisStatus} = 'done'`),
    index('posts_space_analysis_idx')
      .on(t.spaceId, t.analysisStatus)
      .where(sql`${t.analysisStatus} <> 'done'`),
    index('posts_space_featured_idx')
      .on(t.spaceId, t.featuredAt)
      .where(sql`${t.featuredAt} is not null`),
    index('posts_ask_idx').on(t.askId),
    index('posts_author_created_idx').on(t.authorMembershipId, t.createdAt),
    index('posts_deleted_idx').on(t.deletedAt).where(sql`${t.deletedAt} is not null`),
    index('posts_embedding_hnsw_idx').using('hnsw', t.embedding.op('vector_cosine_ops')),
    index('posts_question_group_idx').on(t.questionGroupId),
    /** Embedding backfill (db:embed): live posts without an embedding. */
    index('posts_missing_embedding_idx')
      .on(t.createdAt)
      .where(sql`${t.embedding} is null and ${t.deletedAt} is null`),
    check(
      'posts_title_check',
      sql`char_length(${t.title}) between ${sql.raw(String(P.title.min))} and ${sql.raw(String(P.title.max))}`,
    ),
    check(
      'posts_body_check',
      sql`char_length(${t.body}) between ${sql.raw(String(P.body.min))} and ${sql.raw(String(P.body.max))}`,
    ),
    check(
      'posts_roles_needed_check',
      sql`cardinality(${t.rolesNeeded}) <= ${sql.raw(String(P.rolesNeeded.max))}`,
    ),
    check(
      'posts_counts_check',
      sql`${t.useCount} >= 0 and ${t.buildCount} >= 0 and ${t.commentCount} >= 0`,
    ),
    check(
      'posts_ai_fit_score_check',
      sql`${t.aiFitScore} is null or ${t.aiFitScore} between 0 and 100`,
    ),
    check('posts_analysis_attempts_check', sql`${t.analysisAttempts} >= 0`),
  ],
);

export type PostRow = typeof posts.$inferSelect;
export type NewPostRow = typeof posts.$inferInsert;
