import {
  type CommunityCount,
  type IdeaItem,
  type IdeasPage,
  type IdeasQuery,
  type PeoplePage,
  type PeopleQuery,
  type PersonRow,
  type PostType,
  RANKING,
} from '@fellow-owners/shared';
import { daysAgo, toIso } from '../lib/dates.js';
import type { Logger } from '../lib/logger.js';
import {
  clampLimit,
  decodeOffsetCursor,
  encodeOffsetCursor,
  type PageResult,
  pageByOffset,
} from '../lib/pagination.js';
import { displayName } from '../lib/present.js';
import { rankIdeas, risingScore } from '../lib/ranking.js';
import type { Repos } from '../repositories/index.js';
import type { CommunityBadge, PersonStatsRow } from '../repositories/memberships.repo.js';
import type { OwnerContext } from './access.service.js';
import type { PostsService } from './posts.service.js';

export interface DiscoveryServiceDeps {
  repos: Repos;
  posts: PostsService;
  logger: Logger;
}

export interface RisingEntry {
  membershipId: string;
  score: number;
  /** Posts in the window. */
  posts: number;
  /** use + build signals received on those posts. */
  signals: number;
  /** Accepted team joins decided in the window. */
  teamJoins: number;
}

export interface RankedIdeasFilter {
  communityId?: string | undefined;
  type?: PostType | undefined;
  q?: string | undefined;
}

const round4 = (value: number) => Math.round(value * 10_000) / 10_000;

/** PersonStatsRow -> PersonRow (never an email). */
export function personRow(
  row: PersonStatsRow,
  communities: CommunityBadge[],
  score: number,
): PersonRow {
  return {
    membershipId: row.membershipId,
    name: displayName(row.name),
    image: row.image,
    headline: row.headline,
    skills: row.skills ?? [],
    links: row.links ?? [],
    joinedAt: toIso(row.joinedAt),
    communities: communities.map(({ slug, name, tint }) => ({ slug, name, tint })),
    contributions: {
      posts: row.posts,
      comments: row.comments,
      signalsReceived: row.signalsReceived,
      teams: row.teams,
    },
    risingScore: round4(score),
  };
}

/**
 * Ranked lists for the creator studio (02-trd "Ranking"): the AI scores single items, this code
 * orders them. Ideas use the idea score over the most recent 2,000 matching posts with an offset
 * cursor over the ranked list; people are ranked by contributions with the rising strip on top.
 */
export function createDiscoveryService(deps: DiscoveryServiceDeps) {
  const { repos, posts } = deps;

  /** Rising scores over the 14-day window, best first (members with a positive score only). */
  async function risingScores(spaceId: string, now: Date = new Date()): Promise<RisingEntry[]> {
    const inputs = await repos.memberships.risingInputs(
      spaceId,
      daysAgo(RANKING.rising.windowDays, now),
    );
    return inputs
      .map((input) => ({
        membershipId: input.membershipId,
        score: risingScore(input.posts, input.acceptedTeamJoins),
        posts: input.posts.length,
        signals: input.posts.reduce((sum, post) => sum + post.signalsReceived, 0),
        teamJoins: input.acceptedTeamJoins,
      }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score || a.membershipId.localeCompare(b.membershipId));
  }

  /** PersonRows in the order of `rows`, with joined communities and rising scores. */
  async function toPersonRows(
    rows: PersonStatsRow[],
    scores: Map<string, number>,
  ): Promise<PersonRow[]> {
    const communities = await repos.memberships.communitiesFor(rows.map((row) => row.membershipId));
    return rows.map((row) =>
      personRow(row, communities.get(row.membershipId) ?? [], scores.get(row.membershipId) ?? 0),
    );
  }

  /** The top 10 rising contributors as PersonRows. */
  async function risingPeople(spaceId: string, entries: RisingEntry[]): Promise<PersonRow[]> {
    const top = entries.slice(0, RANKING.rising.top);
    if (top.length === 0) return [];
    const rows = await repos.memberships.peopleByIds(
      spaceId,
      top.map((entry) => entry.membershipId),
    );
    const byId = new Map(rows.map((row) => [row.membershipId, row]));
    const ordered = top.flatMap((entry) => {
      const row = byId.get(entry.membershipId);
      return row ? [row] : [];
    });
    return toPersonRows(ordered, new Map(top.map((entry) => [entry.membershipId, entry.score])));
  }

  /** Idea-ranked posts of the space (hidden included), one page as IdeaItems. */
  async function rankedIdeas(
    owner: OwnerContext,
    filter: RankedIdeasFilter,
    cursor: string | undefined,
    limit: number,
    now: Date = new Date(),
  ): Promise<PageResult<IdeaItem> & { total: number }> {
    const inputs = await repos.posts.listRankInputs(owner.space.id, {
      communityId: filter.communityId,
      type: filter.type,
      q: filter.q,
      includeHidden: true,
    });
    const ranked = rankIdeas(inputs, now);
    const page = pageByOffset(ranked, cursor, limit);
    const rows = await repos.posts.findManyByIds(
      owner.space.id,
      page.items.map((item) => item.id),
    );
    const byId = new Map(rows.map((row) => [row.id, row]));
    const ordered = page.items.flatMap((item) => {
      const row = byId.get(item.id);
      return row ? [row] : [];
    });
    return {
      items: await posts.buildIdeaItems(owner, ordered, now),
      nextCursor: page.nextCursor,
      total: ranked.length,
    };
  }

  return {
    risingScores,
    risingPeople,
    rankedIdeas,
    toPersonRows,

    /** GET /api/studio/ideas */
    async ideas(owner: OwnerContext, query: IdeasQuery): Promise<IdeasPage> {
      const { space } = owner;
      const communities = await repos.communities.listBySpace(space.id, { includeArchived: true });
      const community = query.community
        ? communities.find((row) => row.slug === query.community)
        : undefined;

      const perCommunity = await repos.posts.countByCommunity(space.id, {
        type: query.type,
        q: query.q,
      });
      const countById = new Map(perCommunity.map((row) => [row.communityId, row.count]));
      const counts: CommunityCount[] = communities
        .filter((row) => !row.archivedAt || (countById.get(row.id) ?? 0) > 0)
        .map((row) => ({
          communityId: row.id,
          slug: row.slug,
          name: row.name,
          tint: row.tint,
          count: countById.get(row.id) ?? 0,
        }));

      // An unknown community filter matches nothing.
      if (query.community && !community) return { items: [], nextCursor: null, counts, total: 0 };

      const page = await rankedIdeas(
        owner,
        { communityId: community?.id, type: query.type, q: query.q },
        query.cursor,
        clampLimit(query.limit),
      );
      return { items: page.items, nextCursor: page.nextCursor, counts, total: page.total };
    },

    /**
     * GET /api/studio/people: the rising strip (top 10 over 14 days) and members (owner and
     * removed members excluded) ranked by contributions; `q` matches skills, headline, intro, name
     * and post text; `community` filters by joined community. Offset cursor.
     */
    async people(owner: OwnerContext, query: PeopleQuery): Promise<PeoplePage> {
      const { space } = owner;
      const scores = await risingScores(space.id);
      const scoreById = new Map(scores.map((entry) => [entry.membershipId, entry.score]));
      const rising = await risingPeople(space.id, scores);

      let communityId: string | undefined;
      if (query.community) {
        const community = await repos.communities.findBySlug(space.id, query.community);
        if (!community) return { items: [], nextCursor: null, rising, total: 0 };
        communityId = community.id;
      }

      const offset = decodeOffsetCursor(query.cursor);
      const limit = clampLimit(query.limit);
      const { rows, total } = await repos.memberships.listPeople(space.id, {
        q: query.q,
        communityId,
        offset,
        limit,
      });
      const next = offset + rows.length;
      return {
        items: await toPersonRows(rows, scoreById),
        nextCursor: rows.length > 0 && next < total ? encodeOffsetCursor(next) : null,
        rising,
        total,
      };
    },
  };
}

export type DiscoveryService = ReturnType<typeof createDiscoveryService>;
