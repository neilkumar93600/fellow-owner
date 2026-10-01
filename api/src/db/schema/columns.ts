import { LIMITS } from '@fellow-owners/shared';
import { boolean, integer, smallint, text, timestamp, uuid, vector } from 'drizzle-orm/pg-core';
import { analysisStatusEnum } from './enums.js';

/**
 * Reusable column builders. Timestamps are `timestamptz(3)`: millisecond precision matches JS
 * Dates exactly, so (created_at, id) keyset cursors round-trip without skipping rows.
 */
export const timestamptz = (name: string) =>
  timestamp(name, { withTimezone: true, precision: 3, mode: 'date' });

export const createdAt = () => timestamptz('created_at').notNull().defaultNow();

export const updatedAt = () =>
  timestamptz('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

export const uuidPk = () => uuid('id').primaryKey().defaultRandom();

export const EMBEDDING_DIMENSIONS = LIMITS.ai.embeddingDimensions;

export const embedding = (name = 'embedding') => vector(name, { dimensions: EMBEDDING_DIMENSIONS });

/**
 * AI fields shared by `posts` and `inbound` (05 §2 "AI fields"), written only by the AI module.
 * `analysis_claimed_at` is the sweep lease: a claimed row is skipped by other sweeps for a few
 * minutes, so concurrent sweeps never analyze the same item twice.
 */
export const aiFields = () => ({
  analysisStatus: analysisStatusEnum('analysis_status').notNull().default('pending'),
  analysisAttempts: smallint('analysis_attempts').notNull().default(0),
  analysisError: text('analysis_error'),
  analysisClaimedAt: timestamptz('analysis_claimed_at'),
  contentHash: text('content_hash').notNull(),
  scoredTasteVersion: integer('scored_taste_version'),
  aiSummary: text('ai_summary'),
  aiCategory: text('ai_category'),
  aiFitScore: smallint('ai_fit_score'),
  aiFitReason: text('ai_fit_reason'),
  aiTags: text('ai_tags').array(),
  aiSkills: text('ai_skills').array(),
  aiIsSpam: boolean('ai_is_spam'),
  embedding: embedding(),
});
