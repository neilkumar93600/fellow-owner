import {
  type communityDetailQuerySchema,
  type createCommunitySchema,
  LIMITS,
  type PublicCommunity,
  type StudioCommunity,
  type StudioCommunityDetail,
  type updateCommunitySchema,
} from '@fellow-owners/shared';
import type { z } from 'zod';
import type { Db } from '../db/client.js';
import type { DigestRow } from '../db/schema/ai.js';
import { daysAgo, toIso, toIsoOrNull } from '../lib/dates.js';
import { conflict, notFound } from '../lib/errors.js';
import type { Logger } from '../lib/logger.js';
import { clampLimit, decodeOffsetCursor } from '../lib/pagination.js';
import { publicCommunity } from '../lib/present.js';
import { changePct } from '../lib/ranking.js';
import { slugify } from '../lib/slug.js';
import type { CommunityUpdate, CommunityWithStats } from '../repositories/communities.repo.js';
import type { Repos } from '../repositories/index.js';
import type { OwnerContext } from './access.service.js';
import type { DiscoveryService } from './discovery.service.js';
import type { LimitsService } from './limits.service.js';

export type CreateCommunityBody = z.output<typeof createCommunitySchema>;
export type UpdateCommunityBody = z.output<typeof updateCommunitySchema>;
export type CommunityDetailQuery = z.output<typeof communityDetailQuerySchema>;

export interface CommunitiesServiceDeps {
  db: Db;
  repos: Repos;
  limits: LimitsService;
  discovery: DiscoveryService;
  logger: Logger;
}

/** The one-line digest (P1) stored in digests.content.summary, when there is one. */
function digestLine(digest: DigestRow | undefined): string | null {
  const summary = digest?.content.summary;
  return typeof summary === 'string' && summary.trim().length > 0 ? summary : null;
}

export function studioCommunity(
  row: CommunityWithStats,
  digest: DigestRow | undefined,
): StudioCommunity {
  // Members a week ago ~ members now minus this week's joins (leaves are not tracked).
  const weekAgo = Math.max(0, row.memberCount - row.joinsSince);
  return {
    ...publicCommunity(row),
    archivedAt: toIsoOrNull(row.archivedAt),
    postCount: row.postCount,
    postsThisWeek: row.postsSince,
    joinsThisWeek: row.joinsSince,
    trendPct: changePct(row.memberCount, weekAgo),
    digest: digestLine(digest),
    createdAt: toIso(row.createdAt),
  };
}

/**
 * Communities: the public list (bio page, join) and the owner's management (create, rename,
 * archive, stats, detail). Archived communities disappear from fan pages but keep their posts.
 */
export function createCommunitiesService(deps: CommunitiesServiceDeps) {
  const { db, repos, limits, discovery } = deps;
  const log = deps.logger.child({ module: 'communities' });

  async function withStats(spaceId: string): Promise<StudioCommunity[]> {
    const [rows, digests] = await Promise.all([
      repos.communities.listWithStats(spaceId, daysAgo(7)),
      repos.digests.latestForCommunities(spaceId),
    ]);
    return rows.map((row) => studioCommunity(row, digests.get(row.id)));
  }

  async function oneWithStats(spaceId: string, id: string): Promise<StudioCommunity> {
    const found = (await withStats(spaceId)).find((row) => row.id === id);
    if (!found) throw notFound('Community');
    return found;
  }

  return {
    /** Non-archived communities in sort order (bio page, join step 2). */
    async publicList(spaceId: string): Promise<PublicCommunity[]> {
      const rows = await repos.communities.listBySpace(spaceId);
      return rows.map(publicCommunity);
    },

    /** GET /api/studio/communities: archived included (flagged by archivedAt). */
    async studioList(owner: OwnerContext): Promise<StudioCommunity[]> {
      return withStats(owner.space.id);
    },

    /** POST /api/studio/communities: max 20 per space; slug from the name when absent; 409 dup. */
    async create(owner: OwnerContext, input: CreateCommunityBody): Promise<StudioCommunity> {
      const { space } = owner;
      const slug = input.slug ?? slugify(input.name, LIMITS.community.slug.max, 'community');
      const created = await db.transaction(async (tx) => {
        await limits.lockWrites(space.id, owner.userId, tx);
        const total = await repos.communities.countBySpace(space.id, tx);
        if (total >= LIMITS.community.perSpace.max) {
          throw conflict(`A space can have up to ${LIMITS.community.perSpace.max} communities`);
        }
        if (await repos.communities.findBySlug(space.id, slug, tx)) {
          throw conflict('A community with this slug already exists', { slug });
        }
        return repos.communities.insert(
          {
            spaceId: space.id,
            slug,
            name: input.name,
            description: input.description?.trim() ? input.description : null,
            tint: input.tint,
            icon: input.icon,
            sortOrder: await repos.communities.nextSortOrder(space.id, tx),
          },
          tx,
        );
      });
      log.info({ spaceId: space.id, communityId: created.id, slug }, 'community created');
      return oneWithStats(space.id, created.id);
    },

    /** PATCH /api/studio/communities/:id: rename, describe, restyle, reorder, archive/restore. */
    async update(
      owner: OwnerContext,
      id: string,
      input: UpdateCommunityBody,
    ): Promise<StudioCommunity> {
      const { space } = owner;
      const current = await repos.communities.findById(space.id, id);
      if (!current) throw notFound('Community');
      const patch: CommunityUpdate = {};
      if (input.name !== undefined) patch.name = input.name;
      if (input.description !== undefined) {
        patch.description = input.description?.trim() ? input.description : null;
      }
      if (input.tint !== undefined) patch.tint = input.tint;
      if (input.icon !== undefined) patch.icon = input.icon;
      if (input.sortOrder !== undefined) patch.sortOrder = input.sortOrder;
      if (input.archived !== undefined) {
        patch.archivedAt = input.archived ? (current.archivedAt ?? new Date()) : null;
      }
      await repos.communities.update(space.id, id, patch);
      return oneWithStats(space.id, id);
    },

    /** GET /api/studio/communities/:slug: stats, members ranked by contributions, ranked posts. */
    async detail(
      owner: OwnerContext,
      slug: string,
      query: CommunityDetailQuery,
    ): Promise<StudioCommunityDetail> {
      const { space } = owner;
      const row = await repos.communities.findBySlug(space.id, slug);
      if (!row) throw notFound('Community');
      const limit = clampLimit(query.limit);
      const offset = decodeOffsetCursor(query.cursor);

      const [community, people, scores, posts] = await Promise.all([
        oneWithStats(space.id, row.id),
        repos.memberships.listPeople(space.id, { communityId: row.id, offset, limit }),
        discovery.risingScores(space.id),
        discovery.rankedIdeas(owner, { communityId: row.id }, query.cursor, limit),
      ]);
      const members = await discovery.toPersonRows(
        people.rows,
        new Map(scores.map((entry) => [entry.membershipId, entry.score])),
      );
      return { community, members, posts: posts.items };
    },
  };
}

export type CommunitiesService = ReturnType<typeof createCommunitiesService>;
