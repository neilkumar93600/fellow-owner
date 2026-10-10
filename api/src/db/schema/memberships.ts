import type { LinkItem } from '@fellow-owners/shared';
import { sql } from 'drizzle-orm';
import { check, index, jsonb, pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { user } from './auth.js';
import { embedding, timestamptz, uuidPk } from './columns.js';
import { membershipRoleEnum } from './enums.js';
import { spaces } from './spaces.js';

/** A user's membership of a space (owner or member) with their profile in that space. */
export const memberships = pgTable(
  'memberships',
  {
    id: uuidPk(),
    spaceId: uuid('space_id')
      .notNull()
      .references(() => spaces.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    role: membershipRoleEnum('role').notNull().default('member'),
    headline: text('headline'),
    intro: text('intro'),
    skills: text('skills').array().notNull().default(sql`'{}'::text[]`),
    links: jsonb('links').$type<LinkItem[]>().notNull().default([]),
    /** P1: from headline + intro + skills, filled once F17 ships. */
    embedding: embedding(),
    /** "Fans of the week": set when the owner approves a shout-out. */
    spotlightAt: timestamptz('spotlight_at'),
    spotlightNote: text('spotlight_note'),
    removedAt: timestamptz('removed_at'),
    /** Set with removedAt when the member left on their own (they may rejoin); null when removed. */
    leftAt: timestamptz('left_at'),
    joinedAt: timestamptz('joined_at').notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('memberships_space_user_uidx').on(t.spaceId, t.userId),
    /** At most one owner membership per space. */
    uniqueIndex('memberships_space_owner_uidx').on(t.spaceId).where(sql`${t.role} = 'owner'`),
    index('memberships_space_joined_idx').on(t.spaceId, t.joinedAt.desc().nullsFirst()),
    index('memberships_user_idx').on(t.userId),
    index('memberships_skills_gin_idx').using('gin', t.skills),
    index('memberships_embedding_hnsw_idx').using('hnsw', t.embedding.op('vector_cosine_ops')),
    check(
      'memberships_spotlight_note_check',
      sql`${t.spotlightNote} is null or char_length(${t.spotlightNote}) <= 280`,
    ),
  ],
);

export type MembershipRow = typeof memberships.$inferSelect;
export type NewMembershipRow = typeof memberships.$inferInsert;
