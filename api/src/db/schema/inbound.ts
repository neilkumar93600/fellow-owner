import { LIMITS, type LinkItem } from '@fellow-owners/shared';
import { sql } from 'drizzle-orm';
import { boolean, check, index, jsonb, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { aiFields, createdAt, timestamptz, updatedAt, uuidPk } from './columns.js';
import { pitchStatusEnum, pitchTypeEnum } from './enums.js';
import { memberships } from './memberships.js';
import { spaces } from './spaces.js';

const P = LIMITS.pitch;

/** Pitches sent to the creator (UI word: pitch). */
export const inbound = pgTable(
  'inbound',
  {
    id: uuidPk(),
    spaceId: uuid('space_id')
      .notNull()
      .references(() => spaces.id, { onDelete: 'cascade' }),
    senderMembershipId: uuid('sender_membership_id')
      .notNull()
      .references(() => memberships.id, { onDelete: 'cascade' }),
    /** Chosen by the sender. The AI's view is ai_category. */
    type: pitchTypeEnum('type').notNull(),
    subject: text('subject').notNull(),
    body: text('body').notNull(),
    links: jsonb('links').$type<LinkItem[]>().notNull().default([]),
    status: pitchStatusEnum('status').notNull().default('new'),
    /** True when the AI flags spam; cleared on Restore. */
    isFiltered: boolean('is_filtered').notNull().default(false),
    creatorReply: text('creator_reply'),
    repliedAt: timestamptz('replied_at'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    ...aiFields(),
  },
  (t) => [
    index('inbound_space_status_fit_idx').on(t.spaceId, t.status, t.aiFitScore.desc()),
    index('inbound_space_created_idx').on(t.spaceId, t.createdAt.desc().nullsFirst()),
    index('inbound_sender_created_idx').on(t.senderMembershipId, t.createdAt),
    index('inbound_space_analysis_idx')
      .on(t.spaceId, t.analysisStatus)
      .where(sql`${t.analysisStatus} <> 'done'`),
    check(
      'inbound_subject_check',
      sql`char_length(${t.subject}) between ${sql.raw(String(P.subject.min))} and ${sql.raw(String(P.subject.max))}`,
    ),
    check(
      'inbound_body_check',
      sql`char_length(${t.body}) between ${sql.raw(String(P.body.min))} and ${sql.raw(String(P.body.max))}`,
    ),
    check(
      'inbound_creator_reply_check',
      sql`${t.creatorReply} is null or char_length(${t.creatorReply}) between ${sql.raw(String(P.reply.min))} and ${sql.raw(String(P.reply.max))}`,
    ),
    check(
      'inbound_ai_fit_score_check',
      sql`${t.aiFitScore} is null or ${t.aiFitScore} between 0 and 100`,
    ),
    check('inbound_analysis_attempts_check', sql`${t.analysisAttempts} >= 0`),
  ],
);

export type InboundRow = typeof inbound.$inferSelect;
export type NewInboundRow = typeof inbound.$inferInsert;
