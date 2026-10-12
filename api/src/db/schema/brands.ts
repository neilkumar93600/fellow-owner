import {
  BRAND_BUDGET_RANGES,
  BRAND_LIMITS,
  BRAND_REQUEST_SOURCES,
  BRAND_REQUEST_STATUSES,
  BRAND_URGENCIES,
  type BrandBudgetRange,
  type BrandFlag,
  type BrandRequestSource,
  type BrandRequestStatus,
  type BrandUrgency,
} from '@fellow-owners/shared';
import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  pgTable,
  smallint,
  text,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { createdAt, timestamptz, updatedAt, uuidPk } from './columns.js';
import { analysisStatusEnum } from './enums.js';
import { spaces } from './spaces.js';

// F5 Brand inbox (creator suite, 0010): requests from the work-with-me form, forwarded email and
// (behind the META switch) Instagram DMs, plus the Instagram connection whose token is stored
// encrypted (lib/crypto.ts). Owner-only data: every row carries space_id (RLS-ready).

const B = BRAND_LIMITS;
const n = (value: number) => sql.raw(String(value));
const inList = (values: readonly string[]) => sql.raw(values.map((v) => `'${v}'`).join(', '));

export const brandRequests = pgTable(
  'brand_requests',
  {
    id: uuidPk(),
    spaceId: uuid('space_id')
      .notNull()
      .references(() => spaces.id, { onDelete: 'cascade' }),
    source: text('source').$type<BrandRequestSource>().notNull(),
    /** Email Message-ID or Instagram message id: a redelivered webhook is stored once. */
    externalId: text('external_id'),
    status: text('status').$type<BrandRequestStatus>().notNull().default('new'),
    brandName: text('brand_name').notNull(),
    contactName: text('contact_name'),
    /** Lowercased. */
    email: text('email'),
    /** Instagram username (without @) for DMs. */
    senderHandle: text('sender_handle'),
    website: text('website'),
    budgetRange: text('budget_range').$type<BrandBudgetRange>(),
    deliverables: text('deliverables'),
    timeline: text('timeline'),
    /** The email subject (email source). */
    subject: text('subject'),
    message: text('message').notNull(),
    /** When the work-with-me form's consent box was ticked (form source). */
    consentedAt: timestamptz('consented_at'),
    // AI triage (task brandTriage), written only by the brands service.
    analysisStatus: analysisStatusEnum('analysis_status').notNull().default('pending'),
    analysisAttempts: smallint('analysis_attempts').notNull().default(0),
    /** Lease for a retry sweep: a claimed row is skipped by other runs for a few minutes. */
    analysisClaimedAt: timestamptz('analysis_claimed_at'),
    scoredTasteVersion: integer('scored_taste_version'),
    aiScore: smallint('ai_score'),
    aiSummary: text('ai_summary'),
    aiFlags: text('ai_flags').array().$type<BrandFlag[]>().notNull().default(sql`'{}'::text[]`),
    aiUrgency: text('ai_urgency').$type<BrandUrgency>(),
    receivedAt: timestamptz('received_at').notNull().defaultNow(),
    /** First time the creator opened it. */
    readAt: timestamptz('read_at'),
    /** When it was Today's "Don't miss" pick. */
    pickedAt: timestamptz('picked_at'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('brand_requests_space_received_idx').on(t.spaceId, t.receivedAt.desc().nullsFirst()),
    index('brand_requests_space_status_received_idx').on(
      t.spaceId,
      t.status,
      t.receivedAt.desc().nullsFirst(),
    ),
    uniqueIndex('brand_requests_space_source_external_uidx')
      .on(t.spaceId, t.source, t.externalId)
      .where(sql`${t.externalId} is not null`),
    /** Triage retries: rows not analyzed yet. */
    index('brand_requests_analysis_idx')
      .on(t.spaceId, t.analysisStatus)
      .where(sql`${t.analysisStatus} <> 'done'`),
    check('brand_requests_source_check', sql`${t.source} in (${inList(BRAND_REQUEST_SOURCES)})`),
    check('brand_requests_status_check', sql`${t.status} in (${inList(BRAND_REQUEST_STATUSES)})`),
    check(
      'brand_requests_budget_range_check',
      sql`${t.budgetRange} is null or ${t.budgetRange} in (${inList(BRAND_BUDGET_RANGES)})`,
    ),
    check(
      'brand_requests_ai_urgency_check',
      sql`${t.aiUrgency} is null or ${t.aiUrgency} in (${inList(BRAND_URGENCIES)})`,
    ),
    check(
      'brand_requests_ai_score_check',
      sql`${t.aiScore} is null or ${t.aiScore} between 0 and 100`,
    ),
    check(
      'brand_requests_ai_summary_check',
      sql`${t.aiSummary} is null or char_length(${t.aiSummary}) <= ${n(B.summaryMax)}`,
    ),
    check('brand_requests_analysis_attempts_check', sql`${t.analysisAttempts} >= 0`),
    check(
      'brand_requests_brand_name_check',
      sql`char_length(${t.brandName}) between ${n(B.brandName.min)} and ${n(B.brandName.max)}`,
    ),
    check(
      'brand_requests_contact_name_check',
      sql`${t.contactName} is null or char_length(${t.contactName}) <= ${n(B.contactName.max)}`,
    ),
    check(
      'brand_requests_email_check',
      sql`${t.email} is null or (char_length(${t.email}) <= ${n(B.email.max)} and ${t.email} = lower(${t.email}))`,
    ),
    check(
      'brand_requests_sender_handle_check',
      sql`${t.senderHandle} is null or char_length(${t.senderHandle}) <= ${n(B.senderHandle.max)}`,
    ),
    check(
      'brand_requests_website_check',
      sql`${t.website} is null or char_length(${t.website}) <= 2048`,
    ),
    check(
      'brand_requests_deliverables_check',
      sql`${t.deliverables} is null or char_length(${t.deliverables}) <= ${n(B.deliverables.max)}`,
    ),
    check(
      'brand_requests_timeline_check',
      sql`${t.timeline} is null or char_length(${t.timeline}) <= ${n(B.timeline.max)}`,
    ),
    check(
      'brand_requests_subject_check',
      sql`${t.subject} is null or char_length(${t.subject}) <= ${n(B.subject.max)}`,
    ),
    check(
      'brand_requests_message_check',
      sql`char_length(${t.message}) between 1 and ${n(B.message.max)}`,
    ),
  ],
);

/**
 * The Instagram professional account a space connected (DM sync, behind the META switch). One per
 * space, and one space per Instagram account (webhooks name the account id). The access token is
 * only ever stored as lib/crypto.ts ciphertext ("v1.<iv>.<tag>.<data>"); the CHECK refuses plain text.
 */
export const instagramConnections = pgTable(
  'instagram_connections',
  {
    spaceId: uuid('space_id')
      .primaryKey()
      .references(() => spaces.id, { onDelete: 'cascade' }),
    igUserId: text('ig_user_id').notNull(),
    username: text('username'),
    /** AES-256-GCM ciphertext (FIELD_ENCRYPTION_KEY), never the raw token. */
    accessTokenEnc: text('access_token_enc').notNull(),
    tokenExpiresAt: timestamptz('token_expires_at'),
    scopes: text('scopes').array().notNull().default(sql`'{}'::text[]`),
    connectedAt: timestamptz('connected_at').notNull().defaultNow(),
    /** Last webhook event received for this account. */
    lastEventAt: timestamptz('last_event_at'),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('instagram_connections_ig_user_uidx').on(t.igUserId),
    check(
      'instagram_connections_token_check',
      sql`${t.accessTokenEnc} ~ '^v[0-9]+\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+$'`,
    ),
  ],
);

export type BrandRequestRow = typeof brandRequests.$inferSelect;
export type NewBrandRequestRow = typeof brandRequests.$inferInsert;
export type InstagramConnectionRow = typeof instagramConnections.$inferSelect;
export type NewInstagramConnectionRow = typeof instagramConnections.$inferInsert;
