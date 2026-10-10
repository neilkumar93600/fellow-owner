import { DIGEST_POSTS_MAX } from '../ai/tasks/community-digest.js';
import type { CoreDeps } from '../container.js';
import { daysAgo, utcDayString, weekStart } from '../lib/dates.js';

export type DigestWriterDeps = Pick<CoreDeps, 'repos' | 'ai' | 'logger'>;

/**
 * Weekly community digests (tick `community_digests`, Mondays 13:00 UTC). Each non-archived
 * community with a post in the last 7 days gets one digest per ISO week, dated that week's
 * Monday; StudioCommunity.digest shows the latest summary.
 */
export function createDigestWriter(deps: DigestWriterDeps) {
  const log = deps.logger.child({ module: 'community-digests' });
  return {
    /**
     * Resolves with the digests written. A community whose AI call fails is skipped and retried
     * on the next run in the same week (its digest is still missing).
     */
    async writeDue(now: Date): Promise<number> {
      const periodDate = utcDayString(weekStart(now));
      const since = daysAgo(7, now);
      const due = await deps.repos.digests.dueCommunities(periodDate, since, now);
      let written = 0;
      for (const community of due) {
        try {
          const posts = await deps.repos.digests.weekPosts(
            community.communityId,
            since,
            now,
            DIGEST_POSTS_MAX,
          );
          const output = await deps.ai.communityDigest(
            { communityName: community.communityName, periodDate, posts },
            {
              spaceId: community.spaceId,
              userId: null,
              refType: 'community',
              refId: community.communityId,
            },
          );
          await deps.repos.digests.upsert({
            spaceId: community.spaceId,
            communityId: community.communityId,
            periodDate,
            content: {
              summary: output.summary,
              themes: output.themes,
              standouts: output.standouts,
            },
            model: output.model,
          });
          written += 1;
        } catch (err) {
          log.warn(
            { err, spaceId: community.spaceId, communityId: community.communityId },
            'community digest failed',
          );
        }
      }
      if (due.length > 0) log.info({ due: due.length, written, periodDate }, 'community digests');
      return written;
    },
  };
}

export type DigestWriter = ReturnType<typeof createDigestWriter>;
