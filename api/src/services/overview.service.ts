import {
  type ActivityWeek,
  type InboxMixSlice,
  type Overview,
  PITCH_TYPE_LABELS,
  PITCH_TYPES,
  type PitchType,
  type StatValue,
  type SweepResponse,
  type TotalMonthToday,
} from '@fellow-owners/shared';
import type { Analyzer } from '../ai/types.js';
import { daysAgo, lastWeekStarts, startOfUtcDay, startOfUtcMonth, toIso } from '../lib/dates.js';
import { changePct } from '../lib/ranking.js';
import type { Repos } from '../repositories/index.js';
import type { OwnerContext } from './access.service.js';

/** How many weeks the "Fanbase activity" chart shows. */
const ACTIVITY_WEEKS = 12;

function isPitchType(value: string): value is PitchType {
  return (PITCH_TYPES as readonly string[]).includes(value);
}

function stat(value: number, previous: number): StatValue {
  return { value, previous, changePct: changePct(value, previous) };
}

function totals(total: number, month: number, today: number): TotalMonthToday {
  return { total, month, today };
}

function slice(key: PitchType | 'spam', count: number): InboxMixSlice {
  return { key, label: key === 'spam' ? 'Spam' : PITCH_TYPE_LABELS[key], count };
}

/**
 * The Today screen (02-trd "Overview metrics"):
 * - Members: active memberships (removed_at null; fans only, the owner is not counted) vs the
 *   count 7 days ago
 * - Ideas this week: posts of any type created in the last 7 days, not deleted, vs the 7 before
 * - Opportunities waiting: pitches `new`, not filtered, ai_fit_score >= 70. Status history is not
 *   stored, so the comparison is the waiting backlog that had already arrived 7 days ago
 * - This week card: member joins, posts and pitches as total / this month / today (UTC)
 * - Inbox mix: pitches of the last 30 days by AI category (chosen type until analyzed) plus
 *   filtered spam as its own slice; withdrawn pitches excluded
 * - Fanbase activity: weekly member joins and posts over the last 12 weeks (Monday, UTC)
 * - pendingAnalysis and aiPaused (today's tokens vs ai_daily_token_budget)
 */
export function createOverviewService(deps: { repos: Repos; analyzer: Analyzer }) {
  const { repos } = deps;

  return {
    /**
     * POST /api/studio/sweep (called by the dashboard on load): claims up to 25 pending items of
     * the space and analyzes them 5 at a time in the background. Safe to call repeatedly.
     */
    async sweep(owner: OwnerContext): Promise<SweepResponse> {
      const { claimed, remaining } = await deps.analyzer.sweep(owner.space.id);
      return { claimed, remaining };
    },

    async overview(owner: OwnerContext, now: Date = new Date()): Promise<Overview> {
      const spaceId = owner.space.id;
      const weekAgo = daysAgo(7, now);
      const twoWeeksAgo = daysAgo(14, now);
      const month = startOfUtcMonth(now);
      const today = startOfUtcDay(now);
      const weeks = lastWeekStarts(ACTIVITY_WEEKS, now);
      const firstWeek = weeks[0] ?? today;

      const [
        members,
        membersPrev,
        ideas,
        ideasPrev,
        opportunities,
        opportunitiesPrev,
        joinsTotal,
        joinsMonth,
        joinsToday,
        postsTotal,
        postsMonth,
        postsToday,
        pitchesTotal,
        pitchesMonth,
        pitchesToday,
        mix,
        weeklyJoins,
        weeklyPosts,
        pendingPosts,
        pendingPitches,
        budget,
      ] = await Promise.all([
        repos.memberships.countActive(spaceId),
        repos.memberships.countActiveAt(spaceId, weekAgo),
        repos.posts.countCreated(spaceId, { from: weekAgo }),
        repos.posts.countCreated(spaceId, { from: twoWeeksAgo, to: weekAgo }),
        repos.pitches.countOpportunities(spaceId),
        repos.pitches.countOpportunities(spaceId, { createdTo: weekAgo }),
        repos.memberships.countJoined(spaceId),
        repos.memberships.countJoined(spaceId, { from: month }),
        repos.memberships.countJoined(spaceId, { from: today }),
        repos.posts.countCreated(spaceId),
        repos.posts.countCreated(spaceId, { from: month }),
        repos.posts.countCreated(spaceId, { from: today }),
        repos.pitches.countCreated(spaceId),
        repos.pitches.countCreated(spaceId, { from: month }),
        repos.pitches.countCreated(spaceId, { from: today }),
        repos.pitches.inboxMix(spaceId, daysAgo(30, now)),
        repos.memberships.weeklyJoins(spaceId, firstWeek),
        repos.posts.weeklyCreated(spaceId, firstWeek),
        repos.posts.countPendingAnalysis(spaceId),
        repos.pitches.countPendingAnalysis(spaceId),
        repos.aiRuns.budgetState(spaceId, now),
      ]);

      const joinsByWeek = new Map(weeklyJoins.map((row) => [row.weekStart.getTime(), row.count]));
      const postsByWeek = new Map(weeklyPosts.map((row) => [row.weekStart.getTime(), row.count]));
      const activity: ActivityWeek[] = weeks.map((week) => ({
        weekStart: toIso(week),
        joins: joinsByWeek.get(week.getTime()) ?? 0,
        ideas: postsByWeek.get(week.getTime()) ?? 0,
      }));

      const inboxMix = mix.flatMap((row) =>
        row.key === 'spam' || isPitchType(row.key) ? [slice(row.key, row.count)] : [],
      );

      return {
        stats: {
          members: stat(members, membersPrev),
          ideasThisWeek: stat(ideas, ideasPrev),
          opportunitiesWaiting: stat(opportunities, opportunitiesPrev),
        },
        thisWeek: {
          joins: totals(joinsTotal, joinsMonth, joinsToday),
          ideas: totals(postsTotal, postsMonth, postsToday),
          pitches: totals(pitchesTotal, pitchesMonth, pitchesToday),
        },
        inboxMix,
        activity,
        pendingAnalysis: pendingPosts + pendingPitches,
        aiPaused: budget.paused,
      };
    },
  };
}

export type OverviewService = ReturnType<typeof createOverviewService>;
