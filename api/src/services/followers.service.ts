import {
  type AutoTagResult,
  type autoTagFollowersSchema,
  type createFollowerSchema,
  type Follower,
  type FollowersPage,
  type FollowersQuery,
  type ImportResult,
  type ImportSuggestion,
  type importFollowersSchema,
  LIMITS,
  type TagFollowersResult,
  type tagFollowersSchema,
  type updateFollowerSchema,
} from '@fellow-owners/shared';
import type { z } from 'zod';
import { type AiServices, TAG_FOLLOWERS_BATCH } from '../ai/types.js';
import type { Db } from '../db/client.js';
import type { CommunityRow } from '../db/schema/communities.js';
import type { FollowerRow } from '../db/schema/followers.js';
import { parseAudience, type RowError } from '../lib/audience-import.js';
import { toIso, toIsoOrNull } from '../lib/dates.js';
import { uniqueViolation } from '../lib/db-errors.js';
import { conflict, isAppError, notFound, validationError } from '../lib/errors.js';
import type { Logger } from '../lib/logger.js';
import { clampLimit, decodeTimeCursor, encodeTimeCursor, toPage } from '../lib/pagination.js';
import type {
  FollowerFilter,
  FollowerTagRow,
  FollowerUpdate,
  FollowerWithJoin,
} from '../repositories/followers.repo.js';
import type { Repos } from '../repositories/index.js';
import type { OwnerContext } from './access.service.js';

export type CreateFollowerBody = z.output<typeof createFollowerSchema>;
export type UpdateFollowerBody = z.output<typeof updateFollowerSchema>;
export type ImportFollowersBody = z.output<typeof importFollowersSchema>;
export type TagFollowersBody = z.output<typeof tagFollowersSchema>;
export type AutoTagFollowersBody = z.output<typeof autoTagFollowersSchema>;

export interface FollowersServiceDeps {
  db: Db;
  repos: Repos;
  ai: AiServices;
  logger: Logger;
}

const F = LIMITS.follower;

/** Import suggestions need at least this many notes to cluster. */
export const SUGGEST_MIN_NOTES = 5;

const FULL_MESSAGE = 'Your follower list is full';

const DUPLICATE_MESSAGES: Record<string, string> = {
  followers_space_email_uidx: 'A follower with this email is already on your list',
  followers_space_platform_handle_uidx: 'A follower with this handle is already on your list',
};

/** Dedupe keys: same email, or same platform + handle (case-insensitive). */
function keysOf(row: Pick<FollowerRow, 'email' | 'platform' | 'handle'>): string[] {
  const keys: string[] = [];
  if (row.email) keys.push(`e:${row.email}`);
  if (row.handle) keys.push(`h:${row.platform ?? ''}:${row.handle.toLowerCase()}`);
  return keys;
}

function present(row: FollowerWithJoin, tags: FollowerTagRow[] = []): Follower {
  return {
    id: row.id,
    name: row.name,
    handle: row.handle,
    platform: row.platform,
    email: row.email,
    note: row.note,
    source: row.source,
    communities: tags.map((tag) => ({
      id: tag.communityId,
      slug: tag.slug,
      name: tag.name,
      tint: tag.tint as Follower['communities'][number]['tint'],
      icon: tag.icon as Follower['communities'][number]['icon'],
      taggedBy: tag.taggedBy,
    })),
    membershipId: row.membershipId,
    joinedAt: toIsoOrNull(row.joinedAt),
    createdAt: toIso(row.createdAt),
  };
}

/** Runs an insert or update, turning a duplicate email or handle into a friendly 409. */
async function friendlyDuplicates<T>(write: () => Promise<T>): Promise<T> {
  try {
    return await write();
  } catch (error) {
    const index = uniqueViolation(error);
    const message = index ? DUPLICATE_MESSAGES[index] : undefined;
    if (message) throw conflict(message, { constraint: index });
    throw error;
  }
}

/**
 * The creator's follower roster (F23): CSV or pasted imports (lib/audience-import.ts parses them)
 * with AI-proposed communities (clusterImport), people added by hand, and tags into communities
 * by the creator or the AI. A follower links to their membership when they join the space, or
 * when they are added (by hand, import or a changed email or handle) after joining.
 */
export function createFollowersService(deps: FollowersServiceDeps) {
  const { db, repos, ai } = deps;
  const log = deps.logger.child({ module: 'followers' });

  async function activeCommunities(spaceId: string): Promise<CommunityRow[]> {
    return repos.communities.listBySpace(spaceId);
  }

  /** 400 validation_error unless every id is a non-archived community of the space. */
  async function assertActiveCommunities(spaceId: string, ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const active = new Set((await activeCommunities(spaceId)).map((row) => row.id));
    const issues = ids.flatMap((id, index) =>
      active.has(id)
        ? []
        : [
            {
              location: 'body' as const,
              path: ['communityIds', index],
              message: 'Unknown community',
              code: 'custom',
            },
          ],
    );
    if (issues.length > 0) throw validationError(issues);
  }

  async function load(spaceId: string, id: string): Promise<Follower> {
    const row = await repos.followers.findById(spaceId, id);
    if (!row) throw notFound('Follower');
    const tags = await repos.followers.tagsFor([row.id]);
    return present(row, tags.get(row.id));
  }

  /**
   * Links followers to fans who joined before they were listed (followers.linkJoined). Runs after
   * the write commits, outside its transaction: a race with link-on-join over the same membership
   * hits the unique index and only costs this pass. Never throws.
   */
  async function linkJoined(spaceId: string): Promise<void> {
    try {
      const linked = await repos.followers.linkJoined(spaceId);
      if (linked > 0) log.info({ spaceId, linked }, 'followers linked to members');
    } catch (error) {
      log.warn({ err: error, spaceId }, 'follower link to members failed');
    }
  }

  /** clusterImport over the notes; [] when the AI is unavailable or fails. */
  async function suggestCommunities(
    owner: OwnerContext,
    notes: string[],
  ): Promise<ImportSuggestion[]> {
    if (!ai.clusterImport) return [];
    try {
      const existing = (await activeCommunities(owner.space.id)).map((row) => row.name);
      const output = await ai.clusterImport(
        { creatorName: owner.space.displayName, comments: notes, existingCommunities: existing },
        { spaceId: owner.space.id, userId: owner.userId },
      );
      return output.communities.map(({ name, description, sampleQuotes }) => ({
        name,
        description,
        sampleQuotes,
      }));
    } catch (error) {
      log.warn({ err: error, spaceId: owner.space.id }, 'import suggestions unavailable');
      return [];
    }
  }

  return {
    /** GET /api/studio/followers */
    async list(owner: OwnerContext, query: FollowersQuery): Promise<FollowersPage> {
      const spaceId = owner.space.id;
      const limit = clampLimit(query.limit);
      const cursor = decodeTimeCursor(query.cursor);
      const filter: FollowerFilter = {
        ...(query.q ? { q: query.q } : {}),
        ...(query.joined ? { joined: query.joined === 'yes' } : {}),
      };
      if (query.community === 'untagged') {
        filter.untagged = true;
      } else if (query.community) {
        const community = await repos.communities.findBySlug(spaceId, query.community);
        if (!community || community.archivedAt) {
          const counts = await repos.followers.counts(spaceId);
          return { items: [], nextCursor: null, total: 0, counts };
        }
        filter.communityId = community.id;
      }
      const [rows, total, counts] = await Promise.all([
        repos.followers.list(spaceId, filter, { cursor, limit: limit + 1 }),
        repos.followers.count(spaceId, filter),
        repos.followers.counts(spaceId),
      ]);
      const page = toPage(rows, limit, encodeTimeCursor);
      const tags = await repos.followers.tagsFor(page.items.map((row) => row.id));
      return {
        items: page.items.map((row) => present(row, tags.get(row.id))),
        nextCursor: page.nextCursor,
        total,
        counts,
      };
    },

    /** POST /api/studio/followers: 409 on a duplicate email or platform + handle. */
    async create(owner: OwnerContext, input: CreateFollowerBody): Promise<Follower> {
      const spaceId = owner.space.id;
      const communityIds = input.communityIds ?? [];
      await assertActiveCommunities(spaceId, communityIds);
      const row = await db.transaction(async (tx) => {
        await repos.followers.lockRoster(spaceId, tx);
        if ((await repos.followers.countBySpace(spaceId, tx)) >= F.perSpace) {
          throw conflict(FULL_MESSAGE, { limit: F.perSpace });
        }
        const inserted = await friendlyDuplicates(() =>
          repos.followers.insert(
            {
              spaceId,
              name: input.name,
              handle: input.handle ?? null,
              platform: input.platform ?? null,
              email: input.email ?? null,
              note: input.note || null,
              source: 'manual',
            },
            tx,
          ),
        );
        if (communityIds.length > 0) {
          await repos.followers.replaceTags(inserted.id, communityIds, 'creator', tx);
        }
        return inserted;
      });
      if (row.email || row.handle) await linkJoined(spaceId);
      return load(spaceId, row.id);
    },

    /** PATCH /api/studio/followers/:id: 404 unknown, 409 duplicate, 400 unknown community. */
    async update(owner: OwnerContext, id: string, input: UpdateFollowerBody): Promise<Follower> {
      const spaceId = owner.space.id;
      if (!(await repos.followers.findById(spaceId, id))) throw notFound('Follower');
      if (input.communityIds) await assertActiveCommunities(spaceId, input.communityIds);
      const patch: FollowerUpdate = {};
      if (input.name !== undefined) patch.name = input.name;
      if (input.handle !== undefined) patch.handle = input.handle;
      if (input.platform !== undefined) patch.platform = input.platform;
      if (input.email !== undefined) patch.email = input.email;
      if (input.note !== undefined) patch.note = input.note || null;
      // A new email or handle re-runs the match: drop a link it no longer supports, find a new one.
      const rematch =
        patch.email !== undefined || patch.handle !== undefined || patch.platform !== undefined;
      await db.transaction(async (tx) => {
        const row = await friendlyDuplicates(() => repos.followers.update(spaceId, id, patch, tx));
        if (!row) throw notFound('Follower');
        if (rematch) await repos.followers.unlinkMismatch(spaceId, id, tx);
        if (input.communityIds) {
          await repos.followers.replaceTags(id, input.communityIds, 'creator', tx);
        }
      });
      if (rematch) await linkJoined(spaceId);
      return load(spaceId, id);
    },

    /** DELETE /api/studio/followers/:id: 404 unknown. */
    async remove(owner: OwnerContext, id: string): Promise<void> {
      if (!(await repos.followers.remove(owner.space.id, id))) throw notFound('Follower');
    },

    /** POST /api/studio/followers/import */
    async importFollowers(owner: OwnerContext, input: ImportFollowersBody): Promise<ImportResult> {
      const spaceId = owner.space.id;
      const parsed = parseAudience(input.source, input.text);
      const errors: RowError[] = [...parsed.errors];
      let skipped = parsed.skipped;

      let outcome: { importId: string; created: number; duplicates: number };
      try {
        outcome = await db.transaction(async (tx) => {
          await repos.followers.lockRoster(spaceId, tx);
          const clashes = await repos.followers.findClashes(
            spaceId,
            parsed.rows.flatMap((row) => (row.email ? [row.email] : [])),
            parsed.rows.flatMap((row) => (row.handle ? [row.handle] : [])),
            tx,
          );
          const seen = new Set(clashes.flatMap(keysOf));
          let duplicates = 0;
          const fresh = parsed.rows.filter((row) => {
            const keys = keysOf(row);
            if (keys.some((key) => seen.has(key))) {
              duplicates += 1;
              return false;
            }
            for (const key of keys) seen.add(key);
            return true;
          });
          const room = Math.max(0, F.perSpace - (await repos.followers.countBySpace(spaceId, tx)));
          const overflow = fresh.slice(room);
          if (overflow[0]) errors.push({ line: overflow[0].line, reason: FULL_MESSAGE });
          skipped += overflow.length;

          const importRow = await repos.followers.insertImport(
            { spaceId, source: input.source, status: 'done' },
            tx,
          );
          const inserted = await repos.followers.insertMany(
            fresh.slice(0, room).map((row) => ({
              spaceId,
              name: row.name,
              handle: row.handle,
              platform: row.platform,
              email: row.email,
              note: row.note,
              source: input.source,
              importId: importRow.id,
            })),
            tx,
          );
          // Rows that lost a race with a concurrent insert are duplicates too.
          duplicates += Math.min(room, fresh.length) - inserted.length;
          await repos.followers.updateImport(
            importRow.id,
            {
              itemCount: inserted.length,
              result: { created: inserted.length, duplicates, skipped },
            },
            tx,
          );
          return { importId: importRow.id, created: inserted.length, duplicates };
        });
      } catch (error) {
        if (!isAppError(error)) {
          log.error({ err: error, spaceId }, 'follower import failed');
          await repos.followers
            .insertImport({
              spaceId,
              source: input.source,
              status: 'failed',
              result: { error: 'insert failed' },
            })
            .catch((err: unknown) => log.error({ err, spaceId }, 'failed import not recorded'));
        }
        throw error;
      }

      if (outcome.created > 0) await linkJoined(spaceId);

      const notes = parsed.rows.flatMap((row) => (row.note ? [row.note] : []));
      const suggestions =
        input.suggest && notes.length >= SUGGEST_MIN_NOTES
          ? await suggestCommunities(owner, notes)
          : [];
      if (suggestions.length > 0) {
        await repos.followers.updateImport(outcome.importId, {
          result: {
            created: outcome.created,
            duplicates: outcome.duplicates,
            skipped,
            suggestions,
          },
        });
      }
      log.info(
        { spaceId, importId: outcome.importId, created: outcome.created, skipped },
        'followers imported',
      );
      return {
        importId: outcome.importId,
        source: input.source,
        created: outcome.created,
        duplicates: outcome.duplicates,
        skipped,
        errors: errors.sort((a, b) => a.line - b.line).slice(0, F.importErrorsMax),
        suggestions,
      };
    },

    /** POST /api/studio/followers/tag */
    async tag(owner: OwnerContext, input: TagFollowersBody): Promise<TagFollowersResult> {
      const spaceId = owner.space.id;
      const community = await repos.communities.findById(spaceId, input.communityId);
      if (!community || community.archivedAt) {
        throw validationError([
          { location: 'body', path: ['communityId'], message: 'Unknown community', code: 'custom' },
        ]);
      }
      const ids = (await repos.followers.findManyByIds(spaceId, input.followerIds)).map(
        (row) => row.id,
      );
      const updated =
        input.action === 'add'
          ? await repos.followers.addTag(ids, community.id, 'creator')
          : await repos.followers.removeTag(ids, community.id);
      return { updated };
    },

    /** POST /api/studio/followers/auto-tag */
    async autoTag(owner: OwnerContext, input: AutoTagFollowersBody): Promise<AutoTagResult> {
      const spaceId = owner.space.id;
      const targets = input.followerIds
        ? await repos.followers.findManyByIds(spaceId, input.followerIds)
        : await repos.followers.listUntagged(spaceId, F.bulkMax);
      const withNote = targets.filter((row) => row.note?.trim());
      const communities = await activeCommunities(spaceId);
      if (!ai.tagFollowers) return { tagged: 0, skipped: targets.length, aiPaused: true };
      if (withNote.length === 0 || communities.length === 0) {
        return { tagged: 0, skipped: targets.length, aiPaused: false };
      }

      const tagged = new Set<string>();
      let aiPaused = false;
      for (let start = 0; start < withNote.length; start += TAG_FOLLOWERS_BATCH) {
        const batch = withNote.slice(start, start + TAG_FOLLOWERS_BATCH);
        let output: Awaited<ReturnType<NonNullable<AiServices['tagFollowers']>>>;
        try {
          output = await ai.tagFollowers(
            {
              communities: communities.map(({ id, slug, name, description }) => ({
                id,
                slug,
                name,
                description,
              })),
              followers: batch.map(({ id, name, note }) => ({ id, name, note: note ?? '' })),
            },
            { spaceId, userId: owner.userId },
          );
        } catch (error) {
          log.warn({ err: error, spaceId }, 'auto-tag paused: AI unavailable');
          aiPaused = true;
          break;
        }
        // Keep each follower within communitiesPerFollower active tags.
        const current = await repos.followers.tagsFor(batch.map((row) => row.id));
        const pairs = output.tags.flatMap(({ followerId, communityIds }) => {
          const have = new Set((current.get(followerId) ?? []).map((tag) => tag.communityId));
          const room = Math.max(0, F.communitiesPerFollower - have.size);
          return communityIds
            .filter((communityId) => !have.has(communityId))
            .slice(0, room)
            .map((communityId) => ({ followerId, communityId }));
        });
        for (const added of await repos.followers.addTags(pairs, 'ai')) {
          tagged.add(added.followerId);
        }
      }
      return { tagged: tagged.size, skipped: targets.length - tagged.size, aiPaused };
    },

    /**
     * After a join: links the unlinked follower matching the new member's email or social
     * profile (user.social_platform + user.social_handle) to the membership. Never throws.
     */
    async linkMembership(spaceId: string, membershipId: string, userId: string): Promise<void> {
      try {
        const row = await repos.followers.linkMembership(spaceId, membershipId, userId);
        if (row) log.info({ spaceId, membershipId, followerId: row.id }, 'follower linked on join');
      } catch (error) {
        log.warn({ err: error, spaceId, membershipId }, 'follower link on join failed');
      }
    },
  };
}

export type FollowersService = ReturnType<typeof createFollowersService>;
