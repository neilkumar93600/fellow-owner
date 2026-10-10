import { RETENTION_DAYS } from '@fellow-owners/shared';
import { daysAgo, utcDayString } from '../lib/dates.js';
import type { Logger } from '../lib/logger.js';
import type { Repos } from '../repositories/index.js';

export interface PurgeDeps {
  repos: Pick<Repos, 'posts' | 'comments' | 'clicks' | 'aiRuns' | 'digests' | 'notifications'>;
  logger: Logger;
}

/** Rows deleted per retention rule (05-backend-schema section 8). */
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
  /** The cutoff used for each rule, for the response and the log line. */
  cutoffs: {
    softDeleted: string;
    clickEvents: string;
    aiRuns: string;
    digests: string;
    notifications: string;
  };
}

/**
 * Retention purge (05-backend-schema section 8), run daily by GET/POST /api/cron/purge:
 *
 * | Data                      | Rule     |
 * |---------------------------|----------|
 * | Soft-deleted posts        | 30 days  |
 * | Soft-deleted comments     | 30 days  |
 * | click_events              | 180 days |
 * | ai_runs                   | 90 days  |
 * | digests                   | 30 days  |
 * | Read notifications        | 90 days  |
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
/** Read notifications are deleted after this many days; unread ones stay. */
const READ_NOTIFICATION_DAYS = 90;

export async function purgeExpired(deps: PurgeDeps, now: Date = new Date()): Promise<PurgeResult> {
  const { repos, logger } = deps;
  const started = Date.now();

  const softDeletedBefore = daysAgo(RETENTION_DAYS.softDeleted, now);
  const clicksBefore = daysAgo(RETENTION_DAYS.clickEvents, now);
  const aiRunsBefore = daysAgo(RETENTION_DAYS.aiRuns, now);
  const digestsBefore = daysAgo(RETENTION_DAYS.digests, now);
  const notificationsBefore = daysAgo(READ_NOTIFICATION_DAYS, now);

  // Comments first: a post's comments go with it, and counting them separately keeps the numbers
  // in the result honest rather than hiding them inside the post cascade.
  const comments = await repos.comments.purgeSoftDeleted(softDeletedBefore);
  const posts = await repos.posts.purgeSoftDeleted(softDeletedBefore);
  const clickEvents = await repos.clicks.purgeOlderThan(clicksBefore);
  const aiRuns = await repos.aiRuns.purgeOlderThan(aiRunsBefore);
  // digests.period_date is a date, not a timestamp: compare on the UTC day.
  const digests = await repos.digests.purgeOlderThan(utcDayString(digestsBefore));
  const notifications = await repos.notifications.deleteReadBefore(notificationsBefore);

  const result: PurgeResult = {
    posts,
    comments,
    clickEvents,
    aiRuns,
    digests,
    notifications,
    cutoffs: {
      softDeleted: softDeletedBefore.toISOString(),
      clickEvents: clicksBefore.toISOString(),
      aiRuns: aiRunsBefore.toISOString(),
      digests: utcDayString(digestsBefore),
      notifications: notificationsBefore.toISOString(),
    },
  };

  logger.info(
    { posts, comments, clickEvents, aiRuns, digests, notifications, ms: Date.now() - started },
    'retention purge done',
  );
  return result;
}
