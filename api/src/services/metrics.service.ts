import type { MetricsQuery, StatValue, StudioMetrics } from '@fellow-owners/shared';
import type { CoreDeps } from '../container.js';
import { addDays, startOfUtcDay, utcDayString } from '../lib/dates.js';
import { notFound } from '../lib/errors.js';
import { visitorHash } from '../lib/hash.js';
import { withinCap } from '../middlewares/rate-limit.js';
import { isBot } from './clicks.service.js';

/**
 * Visits recorded per space per day: the per-IP limit alone can be dodged with forged IPs, so
 * this bounds how far anyone can inflate a space's visitor count. Visits past it are dropped.
 */
export const VISITS_PER_SPACE_PER_DAY = 5000;

export type MetricsServiceDeps = Pick<CoreDeps, 'env' | 'repos' | 'logger'>;

/** What a request tells us about a visitor (hashed with CLICK_SALT, never stored raw). */
export interface VisitorInfo {
  ip: string;
  userAgent: string | null;
}

function stat(value: number, previous: number): StatValue {
  return {
    value,
    previous,
    changePct: previous === 0 ? null : Math.round(((value - previous) / previous) * 100),
  };
}

/** Pilot analytics: bio-page visits and the studio metrics card. */
export function createMetricsService(deps: MetricsServiceDeps) {
  const { repos, env } = deps;

  return {
    /**
     * Counts one visitor per UTC day; bots and unknown handles are not counted (404 for unknown),
     * nor anything past VISITS_PER_SPACE_PER_DAY.
     */
    async recordVisit(handle: string, visitor: VisitorInfo): Promise<void> {
      const space = await repos.spaces.findByHandle(handle);
      if (!space) throw notFound('Space');
      if (isBot(visitor.userAgent)) return;
      const day = utcDayString();
      const counted = await withinCap({
        name: 'visit-space',
        key: `${space.id}:${day}`,
        windowSeconds: 86_400,
        max: VISITS_PER_SPACE_PER_DAY,
      });
      if (!counted) return;
      await repos.pageVisits.record(
        space.id,
        visitorHash(visitor.ip, visitor.userAgent ?? '', day, env.CLICK_SALT),
        day,
      );
    },

    /** The last `days` UTC days (today included) against the `days` before them. */
    async studioMetrics(spaceId: string, query: MetricsQuery): Promise<StudioMetrics> {
      const days = query.days;
      const tomorrow = addDays(startOfUtcDay(), 1);
      const from = addDays(tomorrow, -days);
      const previousFrom = addDays(from, -days);
      const day = utcDayString;
      const r = repos.pageVisits;

      const [visitors, previousVisitors, joins, previousJoins, verdicts, collabs, published] =
        await Promise.all([
          r.visitorsBetween(spaceId, day(from), day(tomorrow)),
          r.visitorsBetween(spaceId, day(previousFrom), day(from)),
          r.joinsBetween(spaceId, from, tomorrow),
          r.joinsBetween(spaceId, previousFrom, from),
          r.verdictsBetween(spaceId, from, tomorrow),
          r.collabCount(spaceId),
          r.publishedBetween(spaceId, from, tomorrow),
        ]);

      const rated = verdicts.up + verdicts.down;
      return {
        days,
        bioVisitors: stat(visitors, previousVisitors),
        joins: stat(joins, previousJoins),
        joinRate: visitors === 0 ? null : joins / visitors,
        aiAgreement: { ...verdicts, rate: rated === 0 ? null : verdicts.up / rated },
        collabs,
        promotionsPerWeek: Math.round((published / (days / 7)) * 10) / 10,
      };
    },
  };
}

export type MetricsService = ReturnType<typeof createMetricsService>;
