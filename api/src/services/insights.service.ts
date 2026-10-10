import {
  type CommunityActivityQuery,
  type CommunityActivityReport,
  communityActivityScore,
  type ExportKind,
  RANKING,
} from '@fellow-owners/shared';
import type { Env } from '../config/env.js';
import { type CsvCell, toCsv } from '../lib/csv.js';
import { daysAgo } from '../lib/dates.js';
import type { Logger } from '../lib/logger.js';
import { risingScore } from '../lib/ranking.js';
import type { Repos } from '../repositories/index.js';
import type { CommunityActivityCounts } from '../repositories/insights.repo.js';
import { EXPORT_ROW_CAP } from '../repositories/insights.repo.js';
import type { OwnerContext } from './access.service.js';

export interface InsightsServiceDeps {
  env: Env;
  repos: Repos;
  logger: Logger;
}

const COLUMNS: Record<ExportKind, readonly string[]> = {
  ideas: [
    'id',
    'created_at',
    'type',
    'status',
    'title',
    'community',
    'author',
    'use_count',
    'build_count',
    'comment_count',
    'team_size',
    'fit_score',
    'ai_category',
    'ai_summary',
    'idea_score',
    'featured',
    'hidden',
    'link',
  ],
  people: [
    'membership_id',
    'name',
    'headline',
    'skills',
    'communities',
    'joined_at',
    'posts',
    'comments',
    'signals_received',
    'teams',
    'rising_score',
  ],
  followers: [
    'id',
    'created_at',
    'name',
    'handle',
    'platform',
    'email',
    'note',
    'source',
    'communities',
    'joined',
  ],
  pitches: [
    'id',
    'created_at',
    'type',
    'subject',
    'body',
    'status',
    'sender',
    'filtered',
    'fit_score',
    'ai_category',
    'ai_summary',
    'replied_at',
    'reply',
  ],
};

/**
 * Insights for the owner: which communities are most active (score: communityActivityScore in
 * @fellow-owners/shared) and CSV exports (lib/csv.ts). Read-only.
 */
export function createInsightsService(deps: InsightsServiceDeps) {
  const { env, repos } = deps;

  async function peopleRows(spaceId: string, now: Date): Promise<Array<Record<string, CsvCell>>> {
    const [{ rows }, rising] = await Promise.all([
      repos.memberships.listPeople(spaceId, { limit: EXPORT_ROW_CAP }),
      repos.memberships.risingInputs(spaceId, daysAgo(RANKING.rising.windowDays, now)),
    ]);
    const scores = new Map(
      rising.map((input) => [
        input.membershipId,
        risingScore(input.posts, input.acceptedTeamJoins),
      ]),
    );
    const badges = await repos.memberships.communitiesFor(rows.map((row) => row.membershipId));
    return rows
      .sort((a, b) => b.joinedAt.getTime() - a.joinedAt.getTime())
      .map((row) => ({
        membership_id: row.membershipId,
        name: row.name,
        headline: row.headline,
        skills: row.skills ?? [],
        communities: (badges.get(row.membershipId) ?? []).map((badge) => badge.name),
        joined_at: row.joinedAt,
        posts: row.posts,
        comments: row.comments,
        signals_received: row.signalsReceived,
        teams: row.teams,
        rising_score: Math.round((scores.get(row.membershipId) ?? 0) * 10_000) / 10_000,
      }));
  }

  return {
    /** GET /api/studio/analytics/communities?days= */
    async communityActivity(
      owner: OwnerContext,
      query: CommunityActivityQuery,
    ): Promise<CommunityActivityReport> {
      const spaceId = owner.space.id;
      const to = new Date();
      const from = daysAgo(query.days, to);
      const [communities, current, previous] = await Promise.all([
        repos.communities.listBySpace(spaceId),
        repos.insights.communityActivity(spaceId, from, to),
        repos.insights.communityActivity(spaceId, daysAgo(query.days, from), from),
      ]);
      const counts = new Map<string, CommunityActivityCounts>(
        current.map((row) => [row.communityId, row]),
      );
      const before = new Map(previous.map((row) => [row.communityId, row]));
      const items = communities.flatMap((community) => {
        const now = counts.get(community.id);
        if (!now) return [];
        const score = communityActivityScore(now);
        const previousScore = communityActivityScore(
          before.get(community.id) ?? { posts: 0, comments: 0, signals: 0, newMembers: 0 },
        );
        return [
          {
            id: community.id,
            slug: community.slug,
            name: community.name,
            tint: community.tint,
            icon: community.icon,
            members: now.members,
            newMembers: now.newMembers,
            posts: now.posts,
            comments: now.comments,
            signals: now.signals,
            activeMembers: now.activeMembers,
            followers: now.followers,
            score,
            previousScore,
            change:
              previousScore === 0
                ? null
                : Math.round(((score - previousScore) / previousScore) * 100),
            sortOrder: community.sortOrder,
          },
        ];
      });
      items.sort((a, b) => b.score - a.score || b.members - a.members || a.sortOrder - b.sortOrder);
      return {
        days: query.days,
        from: from.toISOString(),
        to: to.toISOString(),
        communities: items.map(({ sortOrder: _sortOrder, ...item }) => item),
      };
    },

    /** GET /api/studio/export/:kind: the CSV text (header row first, no BOM; the controller adds it). */
    async exportCsv(owner: OwnerContext, kind: ExportKind): Promise<string> {
      const { space } = owner;
      const now = new Date();
      let rows: Array<Record<string, CsvCell>>;
      if (kind === 'ideas') {
        const base = `${env.WEB_ORIGIN.replace(/\/+$/, '')}/${encodeURIComponent(space.handle)}`;
        rows = await repos.insights.ideasForExport(space.id, base, now);
      } else if (kind === 'people') {
        rows = await peopleRows(space.id, now);
      } else if (kind === 'followers') {
        rows = await repos.insights.followersForExport(space.id);
      } else {
        rows = await repos.insights.pitchesForExport(space.id);
      }
      return toCsv(COLUMNS[kind], rows);
    },
  };
}

export type InsightsService = ReturnType<typeof createInsightsService>;
