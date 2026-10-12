import { RETENTION_DAYS } from '@fellow-owners/shared';
import { and, isNotNull, isNull, like, lt, or, sql } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { session, user, verification } from '../db/schema/auth.js';
import { communities } from '../db/schema/communities.js';
import { jobRuns } from '../db/schema/jobs.js';
import { notifications } from '../db/schema/later.js';
import { memberships } from '../db/schema/memberships.js';
import { pageVisits } from '../db/schema/page-visits.js';
import { spaces } from '../db/schema/spaces.js';
import { supportRequests } from '../db/schema/support.js';
import { daysAgo, utcDayString } from '../lib/dates.js';
import type { Logger } from '../lib/logger.js';
import { MEDIA_PATH, type Storage } from '../lib/storage.js';
import type { Repos } from '../repositories/index.js';

export interface PurgeDeps {
  db: Db;
  repos: Pick<Repos, 'posts' | 'comments' | 'clicks' | 'aiRuns' | 'digests' | 'notifications'>;
  logger: Logger;
  storage: Storage;
}

/** Rows deleted (or, for removed members, wiped) per retention rule (05-backend-schema section 8). */
export interface PurgeResult {
  /** Posts soft-deleted more than RETENTION_DAYS.softDeleted ago, hard-deleted. */
  posts: number;
  /** Comments soft-deleted more than RETENTION_DAYS.softDeleted ago, hard-deleted. */
  comments: number;
  clickEvents: number;
  aiRuns: number;
  digests: number;
  /** Read notifications older than READ_NOTIFICATION_DAYS. */
  notifications: number;
  /** Better Auth sessions past their expiry. */
  sessions: number;
  /** Better Auth verification rows (codes, delete tokens) past their expiry. */
  verifications: number;
  /** Unread notifications older than UNREAD_NOTIFICATION_DAYS. */
  unreadNotifications: number;
  supportRequests: number;
  pageVisits: number;
  /** Removed memberships whose intro, links and skills (and embedding) were cleared. */
  removedMemberProfiles: number;
  jobRuns: number;
  /** Bucket objects older than ORPHAN_UPLOAD_HOURS that no row points at (best effort). */
  orphanedUploads: number;
  /** The cutoff used for each rule, for the response and the log line. */
  cutoffs: {
    softDeleted: string;
    clickEvents: string;
    aiRuns: string;
    digests: string;
    notifications: string;
    unreadNotifications: string;
    supportRequests: string;
    pageVisits: string;
    removedMembers: string;
    jobRuns: string;
    orphanedUploads: string;
  };
}

/** Read notifications are deleted after this many days. */
const READ_NOTIFICATION_DAYS = 90;
/** Unread notifications are deleted after this many days. */
const UNREAD_NOTIFICATION_DAYS = 180;
const SUPPORT_REQUEST_DAYS = 365;
const PAGE_VISIT_DAYS = 400;
/** A removed member's intro, links and skills are cleared this long after removal. */
const REMOVED_MEMBER_DAYS = 30;
const JOB_RUN_DAYS = 30;
/** An upload nobody saved (or since replaced) is deleted once it is this old. */
const ORPHAN_UPLOAD_HOURS = 24;
/** The upload prefixes (uploads.service.ts presign), each `<kind>/<owner>/<uuid>.<ext>`. */
const UPLOAD_PREFIXES = ['avatar/', 'member_avatar/', 'space_cover/', 'community_cover/'];

/**
 * Deletes bucket objects older than `before` that no row points at (spaces avatar and cover,
 * communities cover, user image): presigned uploads never saved, and images since replaced.
 * Best effort: a bucket failure is logged and counts what was done so far.
 * ponytail: lists the whole bucket and loads every stored /api/media path into one Set; fine for
 * thousands of images, page by owner prefix if the bucket grows past that.
 */
async function deleteOrphanedUploads(
  { db, storage, logger }: PurgeDeps,
  before: Date,
): Promise<number> {
  if (!storage.enabled) return 0;
  const media = `${MEDIA_PATH}%`;
  const rows = await db.execute<{ url: string }>(sql`
    select ${spaces.avatarUrl} as url from ${spaces} where ${like(spaces.avatarUrl, media)}
    union select ${spaces.coverUrl} from ${spaces} where ${like(spaces.coverUrl, media)}
    union select ${communities.coverUrl} from ${communities} where ${like(communities.coverUrl, media)}
    union select ${user.image} from ${user} where ${like(user.image, media)}`);
  const kept = new Set(rows.map((row) => row.url.slice(MEDIA_PATH.length)));
  let deleted = 0;
  try {
    for (const prefix of UPLOAD_PREFIXES) {
      for (const key of await storage.listBefore(prefix, before)) {
        if (kept.has(key)) continue;
        await storage.delete(key);
        deleted += 1;
      }
    }
  } catch (err) {
    logger.warn({ err, deleted }, 'orphaned uploads: bucket failed, the next run continues');
  }
  return deleted;
}

/**
 * Retention purge (05-backend-schema section 8), run daily by the tick and by /api/cron/purge:
 *
 * | Data                                   | Rule        |
 * |----------------------------------------|-------------|
 * | Soft-deleted posts                     | 30 days     |
 * | Soft-deleted comments                  | 30 days     |
 * | click_events                           | 180 days    |
 * | ai_runs                                | 90 days     |
 * | digests                                | 30 days     |
 * | Read notifications                     | 90 days     |
 * | Unread notifications                   | 180 days    |
 * | Expired sessions and verifications     | at expiry   |
 * | support_requests                       | 365 days    |
 * | page_visits                            | 400 days    |
 * | Removed members' intro, links, skills  | 30 days     |
 * | job_runs                               | 30 days     |
 * | Bucket uploads no row points at        | 24 hours    |
 *
 * Pitches are never purged on a timer (they go when the space or the sender's account goes), and
 * a deleted space cascades, so neither needs a rule here.
 *
 * Each rule runs as its own statement rather than one transaction: a purge is idempotent and the
 * next run picks up whatever this one did not reach, so one slow or failing rule should not roll
 * back the others.
 *
 * ponytail: deletes everything due in one pass, no batching. Each rule is an indexed range delete
 * over a day's worth of rows; add a LIMIT + repeat loop if a backlog ever makes one pass too slow.
 */
export async function purgeExpired(deps: PurgeDeps, now: Date = new Date()): Promise<PurgeResult> {
  const { db, repos, logger } = deps;
  const started = Date.now();

  const softDeletedBefore = daysAgo(RETENTION_DAYS.softDeleted, now);
  const clicksBefore = daysAgo(RETENTION_DAYS.clickEvents, now);
  const aiRunsBefore = daysAgo(RETENTION_DAYS.aiRuns, now);
  const digestsBefore = daysAgo(RETENTION_DAYS.digests, now);
  const notificationsBefore = daysAgo(READ_NOTIFICATION_DAYS, now);
  const unreadBefore = daysAgo(UNREAD_NOTIFICATION_DAYS, now);
  const supportBefore = daysAgo(SUPPORT_REQUEST_DAYS, now);
  const visitsBefore = utcDayString(daysAgo(PAGE_VISIT_DAYS, now));
  const removedBefore = daysAgo(REMOVED_MEMBER_DAYS, now);
  const jobRunsBefore = daysAgo(JOB_RUN_DAYS, now);
  const uploadsBefore = new Date(now.getTime() - ORPHAN_UPLOAD_HOURS * 3_600_000);
  const count = (rows: unknown[]) => rows.length;

  // Comments first: a post's comments go with it, and counting them separately keeps the numbers
  // in the result honest rather than hiding them inside the post cascade.
  const comments = await repos.comments.purgeSoftDeleted(softDeletedBefore);
  const posts = await repos.posts.purgeSoftDeleted(softDeletedBefore);
  const clickEvents = await repos.clicks.purgeOlderThan(clicksBefore);
  const aiRuns = await repos.aiRuns.purgeOlderThan(aiRunsBefore);
  // digests.period_date is a date, not a timestamp: compare on the UTC day.
  const digests = await repos.digests.purgeOlderThan(utcDayString(digestsBefore));
  const notificationsDeleted = await repos.notifications.deleteReadBefore(notificationsBefore);

  const sessions = count(
    await db.delete(session).where(lt(session.expiresAt, now)).returning({ id: session.id }),
  );
  const verifications = count(
    await db
      .delete(verification)
      .where(lt(verification.expiresAt, now))
      .returning({ id: verification.id }),
  );
  const unreadNotifications = count(
    await db
      .delete(notifications)
      .where(and(isNull(notifications.readAt), lt(notifications.createdAt, unreadBefore)))
      .returning({ id: notifications.id }),
  );
  const supportRequestsDeleted = count(
    await db
      .delete(supportRequests)
      .where(lt(supportRequests.createdAt, supportBefore))
      .returning({ id: supportRequests.id }),
  );
  const pageVisitsDeleted = count(
    await db
      .delete(pageVisits)
      .where(lt(pageVisits.day, visitsBefore))
      .returning({ day: pageVisits.day }),
  );
  // Only rows that still hold something, so a second run counts 0.
  const removedMemberProfiles = count(
    await db
      .update(memberships)
      .set({ intro: null, links: [], skills: [], embedding: null })
      .where(
        and(
          isNotNull(memberships.removedAt),
          lt(memberships.removedAt, removedBefore),
          or(
            isNotNull(memberships.intro),
            sql`cardinality(${memberships.skills}) > 0`,
            sql`jsonb_array_length(${memberships.links}) > 0`,
            isNotNull(memberships.embedding),
          ),
        ),
      )
      .returning({ id: memberships.id }),
  );
  const jobRunsDeleted = count(
    await db
      .delete(jobRuns)
      .where(lt(jobRuns.startedAt, jobRunsBefore))
      .returning({ job: jobRuns.job }),
  );

  const orphanedUploads = await deleteOrphanedUploads(deps, uploadsBefore);

  const result: PurgeResult = {
    posts,
    comments,
    clickEvents,
    aiRuns,
    digests,
    notifications: notificationsDeleted,
    sessions,
    verifications,
    unreadNotifications,
    supportRequests: supportRequestsDeleted,
    pageVisits: pageVisitsDeleted,
    removedMemberProfiles,
    jobRuns: jobRunsDeleted,
    orphanedUploads,
    cutoffs: {
      softDeleted: softDeletedBefore.toISOString(),
      clickEvents: clicksBefore.toISOString(),
      aiRuns: aiRunsBefore.toISOString(),
      digests: utcDayString(digestsBefore),
      notifications: notificationsBefore.toISOString(),
      unreadNotifications: unreadBefore.toISOString(),
      supportRequests: supportBefore.toISOString(),
      pageVisits: visitsBefore,
      removedMembers: removedBefore.toISOString(),
      jobRuns: jobRunsBefore.toISOString(),
      orphanedUploads: uploadsBefore.toISOString(),
    },
  };

  const { cutoffs: _cutoffs, ...counts } = result;
  logger.info({ ...counts, ms: Date.now() - started }, 'retention purge done');
  return result;
}
