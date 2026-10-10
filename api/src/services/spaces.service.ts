import type {
  createSpaceSchema,
  FeaturedProject,
  HandleCheck,
  PublicSpace,
  SpacePage,
  StudioSpace,
  updateSettingsSchema,
} from '@fellow-owners/shared';
import { and, eq, inArray, isNull, ne, or } from 'drizzle-orm';
import type { z } from 'zod';
import type { Db } from '../db/client.js';
import { user as users } from '../db/schema/auth.js';
import type { SpaceRow } from '../db/schema/spaces.js';
import { toIso, toIsoOrNull } from '../lib/dates.js';
import { uniqueViolation } from '../lib/db-errors.js';
import { conflict, handleTaken, notFound } from '../lib/errors.js';
import { handleCandidates, handleProblem } from '../lib/handles.js';
import type { Logger } from '../lib/logger.js';
import {
  displayName,
  excerpt,
  fanSpotlight,
  publicCommunity,
  totalFollowers,
} from '../lib/present.js';
import { slugify, uniqueSlug } from '../lib/slug.js';
import type { Repos } from '../repositories/index.js';
import type { SpaceProfileUpdate } from '../repositories/spaces.repo.js';
import type { AccessService, OwnerContext } from './access.service.js';

export type CreateSpaceBody = z.output<typeof createSpaceSchema>;
export type UpdateSettingsBody = z.output<typeof updateSettingsSchema>;

export interface SpacesServiceDeps {
  db: Db;
  repos: Repos;
  access: AccessService;
  logger: Logger;
}

/** Live promotions on the bio page ("Featured by ..."). */
const FEATURED_MAX = 6;
/** "Fans of the week" on the bio page: the latest shout-outs. */
const SPOTLIGHTS_MAX = 6;
/** Handle suggestions returned with `taken` / `reserved` / `invalid`. */
const SUGGESTIONS_MAX = 3;

function nullableText(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function publicSpace(space: SpaceRow, memberCount: number): PublicSpace {
  return {
    id: space.id,
    handle: space.handle,
    displayName: space.displayName,
    bio: space.bio,
    avatarUrl: space.avatarUrl,
    platforms: space.platforms ?? [],
    totalFollowers: totalFollowers(space.platforms),
    memberCount,
    isDemo: space.isDemo,
    coverUrl: space.coverUrl,
  };
}

/**
 * Spaces: the public bio page, onboarding (space + owner membership + communities in one
 * transaction), handle availability, and the owner's settings (profile, taste profile).
 * Saving the taste profile bumps taste_version; items scored with an older version show as stale.
 */
export function createSpacesService(deps: SpacesServiceDeps) {
  const { db, repos, access } = deps;
  const log = deps.logger.child({ module: 'spaces' });

  /**
   * Which of `handles` are taken in the one namespace: a space's handle, or a username of anyone
   * but `exceptUserId` (your own username is yours to use as your handle).
   */
  async function takenHandles(handles: string[], exceptUserId?: string): Promise<Set<string>> {
    if (handles.length === 0) return new Set();
    const mine = exceptUserId ? ne(users.id, exceptUserId) : undefined;
    const [bySpace, byUsername] = await Promise.all([
      repos.spaces.findTakenHandles(handles),
      db
        .select({ username: users.username })
        .from(users)
        .where(and(inArray(users.username, handles), mine)),
    ]);
    for (const row of byUsername) if (row.username) bySpace.add(row.username);
    return bySpace;
  }

  /** Up to 3 free handles near `handle` (handle_, handle.official, handle2, ...). */
  async function suggestions(handle: string, exceptUserId?: string): Promise<string[]> {
    const candidates = handleCandidates(handle);
    if (candidates.length === 0) return [];
    const taken = await takenHandles(candidates, exceptUserId);
    return candidates.filter((candidate) => !taken.has(candidate)).slice(0, SUGGESTIONS_MAX);
  }

  async function studioSpace(space: SpaceRow): Promise<StudioSpace> {
    const [memberCount, communities, owner] = await Promise.all([
      repos.memberships.countActive(space.id),
      repos.communities.listBySpace(space.id),
      repos.spaces.getOwner(space.id),
    ]);
    return {
      ...publicSpace(space, memberCount),
      tasteProfile: space.tasteProfile,
      tasteVersion: space.tasteVersion,
      createdAt: toIso(space.createdAt),
      communityCount: communities.length,
      ownerName: displayName(owner?.name),
      showReadReceipts: space.showReadReceipts,
      bioLinkSharedAt: toIsoOrNull(space.bioLinkSharedAt),
    };
  }

  return {
    studioSpace,

    /**
     * GET /api/spaces/:handle (public, CDN-cached): profile, non-archived communities in sort
     * order, and live promotions newest first (max 6).
     */
    async publicPage(handle: string): Promise<SpacePage> {
      const space = await access.spaceByHandle(handle);
      const [memberCount, communities, live, spotlights] = await Promise.all([
        repos.memberships.countActive(space.id),
        repos.communities.listBySpace(space.id),
        repos.promotions.listLive(space.id, FEATURED_MAX),
        repos.memberships.listSpotlights(space.id, { limit: SPOTLIGHTS_MAX }),
      ]);
      const teamSizes = await repos.teams.acceptedCounts(live.map((row) => row.post.id));
      const featured: FeaturedProject[] = live.flatMap((row) => {
        const { promotion, post, community } = row;
        if (!promotion.showcaseSlug || !promotion.publishedAt) return [];
        return [
          {
            showcaseSlug: promotion.showcaseSlug,
            postId: post.id,
            title: post.title,
            headline: promotion.headline,
            excerpt: excerpt(post.body),
            type: post.type,
            communityName: community.name,
            tint: community.tint,
            teamSize: teamSizes.get(post.id) ?? 0,
            publishedAt: toIso(promotion.publishedAt),
          },
        ];
      });
      return {
        space: publicSpace(space, memberCount),
        communities: communities.map(publicCommunity),
        featured,
        spotlights: spotlights.map(fanSpotlight),
      };
    },

    /**
     * GET /api/studio/handle-check and the public GET /api/handle-available: invalid / reserved /
     * taken (a space handle or a username), plus up to 3 free suggestions. `userId` (signed in)
     * counts that user's own username as free.
     */
    async checkHandle(input: string, userId?: string): Promise<HandleCheck> {
      const handle = input.trim().toLowerCase();
      const problem = handleProblem(handle);
      const taken = problem === null && (await takenHandles([handle], userId)).size > 0;
      const available = problem === null && !taken;
      return {
        handle,
        available,
        reason: problem ?? (taken ? 'taken' : null),
        suggestions: available ? [] : await suggestions(handle, userId),
      };
    },

    /**
     * POST /api/studio/space (onboarding): one transaction for the space, the owner membership
     * and the communities (slugs from names, unique per space). 409 conflict when the user
     * already owns a space; 409 handle_taken with suggestions when the handle is taken (a space
     * handle or someone else's username). The same transaction sets the owner's username to the
     * handle (one identity), so the username unique constraint also settles a race with a
     * sign-up claiming the same handle.
     */
    async create(
      user: { id: string; image?: string | null },
      input: CreateSpaceBody,
    ): Promise<StudioSpace> {
      if (await repos.spaces.findByOwnerUserId(user.id)) {
        throw conflict('You already have a space');
      }
      if ((await takenHandles([input.handle], user.id)).size > 0) {
        throw handleTaken(await suggestions(input.handle, user.id));
      }
      let space: SpaceRow;
      try {
        space = await db.transaction(async (tx) => {
          const created = await repos.spaces.insert(
            {
              ownerUserId: user.id,
              handle: input.handle,
              displayName: input.displayName,
              bio: nullableText(input.bio),
              avatarUrl: input.avatarUrl ?? user.image ?? null,
              platforms: input.platforms,
              tasteProfile: input.tasteProfile,
            },
            tx,
          );
          await repos.memberships.insert(
            { spaceId: created.id, userId: user.id, role: 'owner' },
            tx,
          );
          await tx
            .update(users)
            .set({ username: input.handle, updatedAt: new Date() })
            .where(
              and(
                eq(users.id, user.id),
                or(isNull(users.username), ne(users.username, input.handle)),
              ),
            );
          const taken = new Set<string>();
          const rows = input.communities.map((community, index) => {
            const slug = uniqueSlug(slugify(community.name, 40, 'community'), taken, 40);
            taken.add(slug);
            return {
              spaceId: created.id,
              slug,
              name: community.name,
              description: nullableText(community.description),
              tint: community.tint,
              icon: community.icon,
              sortOrder: index,
            };
          });
          await repos.communities.insertMany(rows, tx);
          return created;
        });
      } catch (error) {
        const constraint = uniqueViolation(error);
        if (constraint === 'spaces_handle_uidx' || constraint === 'user_username_unique') {
          throw handleTaken(await suggestions(input.handle, user.id));
        }
        if (constraint === 'spaces_owner_user_id_uidx') throw conflict('You already have a space');
        throw error;
      }
      log.info({ spaceId: space.id, handle: space.handle }, 'space created');
      return studioSpace(space);
    },

    /** PUT /api/studio/settings: profile and/or taste profile (taste_version + 1). */
    async updateSettings(owner: OwnerContext, input: UpdateSettingsBody): Promise<StudioSpace> {
      const updated = await db.transaction(async (tx) => {
        let row: SpaceRow | null = owner.space;
        const patch: SpaceProfileUpdate = {};
        if (input.profile) {
          patch.displayName = input.profile.displayName;
          patch.platforms = input.profile.platforms;
          if (input.profile.bio !== undefined) patch.bio = nullableText(input.profile.bio);
          if (input.profile.avatarUrl !== undefined) patch.avatarUrl = input.profile.avatarUrl;
          if (input.profile.coverUrl !== undefined) patch.coverUrl = input.profile.coverUrl;
        }
        if (input.showReadReceipts !== undefined) patch.showReadReceipts = input.showReadReceipts;
        if (Object.keys(patch).length > 0) {
          row = await repos.spaces.update(owner.space.id, patch, tx);
        }
        if (input.tasteProfile) {
          row = await repos.spaces.saveTasteProfile(owner.space.id, input.tasteProfile, tx);
        }
        return row;
      });
      if (!updated) throw notFound('Space');
      if (input.tasteProfile) {
        log.info(
          { spaceId: updated.id, tasteVersion: updated.tasteVersion },
          'taste profile saved',
        );
      }
      return studioSpace(updated);
    },
  };
}

export type SpacesService = ReturnType<typeof createSpacesService>;
