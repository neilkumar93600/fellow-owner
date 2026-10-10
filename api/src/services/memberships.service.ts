import type {
  CommunitySuggestion,
  JoinResponse,
  joinSpaceSchema,
  MySpace,
  OwnMembership,
  PersonRow,
  PostCard,
  SuggestCommunitiesResponse,
  updateMembershipSchema,
  ViewerMembership,
} from '@fellow-owners/shared';
import type { z } from 'zod';
import { type AiServices, type BackgroundRunner, isAiUnavailable } from '../ai/types.js';
import type { Db, DbOrTx } from '../db/client.js';
import type { CommunityRow } from '../db/schema/communities.js';
import type { MembershipRow } from '../db/schema/memberships.js';
import type { PostRow } from '../db/schema/posts.js';
import { toIso } from '../lib/dates.js';
import { forbidden, notFound, validationError } from '../lib/errors.js';
import type { Logger } from '../lib/logger.js';
import { clamp, displayName, isLeadRole, pitchView, publicCommunity } from '../lib/present.js';
import type { Repos } from '../repositories/index.js';
import type { MembershipUpdate } from '../repositories/memberships.repo.js';
import type { AccessService, MemberContext, OwnerContext } from './access.service.js';
import type { DiscoveryService } from './discovery.service.js';
import type { FollowersService } from './followers.service.js';
import type { LimitsService } from './limits.service.js';
import type { PostsService } from './posts.service.js';

export type JoinBody = z.output<typeof joinSpaceSchema>;
export type UpdateMembershipBody = z.output<typeof updateMembershipSchema>;

export interface MembershipsServiceDeps {
  db: Db;
  repos: Repos;
  access: AccessService;
  limits: LimitsService;
  posts: PostsService;
  /** PersonRow for PUT /api/studio/people/:membershipId/communities (toPersonRows). */
  discovery: DiscoveryService;
  /** Links a matching follower on join (followers.linkMembership). */
  followers: FollowersService;
  ai: AiServices;
  /** Embeds the member profile after join and profile edits (F17 people who could help). */
  background: BackgroundRunner;
  logger: Logger;
}

/**
 * Removed vs left, the one rule: `removed_at` alone = the owner removed them (they stay out);
 * `removed_at` + `left_at` = they left on their own and may come back.
 */
export function removedByOwner(row: Pick<MembershipRow, 'removedAt' | 'leftAt'>): boolean {
  return row.removedAt !== null && row.leftAt === null;
}

/**
 * An existing membership made usable for join or a pitch: active stays as is; a member who left
 * comes back (active from now, no communities); one the owner removed gets 403.
 */
export async function reactivateMembership(
  repos: Repos,
  spaceId: string,
  row: MembershipRow,
  tx?: DbOrTx,
): Promise<{ row: MembershipRow; rejoined: boolean }> {
  if (!row.removedAt) return { row, rejoined: false };
  const back = removedByOwner(row) ? null : await repos.memberships.rejoin(spaceId, row.id, tx);
  if (!back) throw forbidden('You were removed from this space');
  return { row: back, rejoined: true };
}

/** Empty or whitespace-only optional text is stored as null. */
function nullableText(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/** 400 validation_error unless every id is a non-archived community of the space. */
function assertKnownCommunities(ids: string[], active: Map<string, CommunityRow>): void {
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

/**
 * Memberships (05 §5-6): joining a space (membership + communities in one transaction, member
 * counts kept in sync), the viewer's own profile and "My space", and removal by the owner.
 * Members only ever see their own membership in full; other people come through MemberRef.
 */
export function createMembershipsService(deps: MembershipsServiceDeps) {
  const { db, repos, access, limits, posts } = deps;
  const log = deps.logger.child({ module: 'memberships' });

  /** OwnMembership: the member's profile plus joined (non-archived) community ids. */
  async function ownMembership(membership: MembershipRow): Promise<OwnMembership> {
    const [refs, joined] = await Promise.all([
      repos.memberships.refs([membership.id]),
      repos.memberships.communitiesFor([membership.id]),
    ]);
    return {
      id: membership.id,
      role: membership.role,
      name: displayName(refs.get(membership.id)?.name),
      headline: membership.headline,
      intro: membership.intro,
      skills: membership.skills ?? [],
      links: membership.links ?? [],
      communityIds: (joined.get(membership.id) ?? []).map((badge) => badge.id),
      joinedAt: toIso(membership.joinedAt),
    };
  }

  async function activeCommunities(spaceId: string): Promise<Map<string, CommunityRow>> {
    const rows = await repos.communities.listBySpace(spaceId);
    return new Map(rows.map((row) => [row.id, row]));
  }

  /**
   * Background: embeds headline + intro + skills so the member can show up as "people who could
   * help". Never throws; a failure keeps the old vector and db:embed fills gaps later.
   */
  function embedProfile(spaceId: string, membership: MembershipRow): void {
    const body = [membership.intro, (membership.skills ?? []).join(', ')]
      .filter((part): part is string => Boolean(part?.trim()))
      .join('\n');
    const title = membership.headline?.trim() ?? '';
    if (!title && !body) return;
    deps.background.run('embed-membership', async () => {
      try {
        const vector = await deps.ai.embedItem(
          { title, body },
          { spaceId, userId: membership.userId, refType: 'membership', refId: membership.id },
        );
        await repos.memberships.update(spaceId, membership.id, { embedding: vector });
      } catch (error) {
        log.warn({ err: error, membershipId: membership.id }, 'membership embedding failed');
      }
    });
  }

  return {
    ownMembership,

    /** GET /api/spaces/:handle/membership: who the viewer is here (signed out is fine). */
    async viewer(handle: string, userId: string | null): Promise<ViewerMembership> {
      const space = await access.spaceByHandle(handle);
      if (!userId) return { signedIn: false, isOwner: false, membership: null };
      const membership = await access.activeMembership(space.id, userId);
      return {
        signedIn: true,
        isOwner: space.ownerUserId === userId,
        membership: membership ? await ownMembership(membership) : null,
      };
    },

    /**
     * POST /api/spaces/:handle/suggest-communities (join step 2). 10 per user per hour (429).
     * Any AI failure (budget, provider, disabled) answers 200 { available: false }.
     */
    async suggest(
      handle: string,
      userId: string,
      intro: string,
    ): Promise<SuggestCommunitiesResponse> {
      const space = await access.spaceByHandle(handle);
      const communities = await repos.communities.listBySpace(space.id);
      if (communities.length === 0) return { available: true, suggestions: [] };
      await limits.assertSuggestionsAllowed(userId);

      const membership = await access.activeMembership(space.id, userId);
      const bySlug = new Map(communities.map((row) => [row.slug, row]));
      try {
        const output = await deps.ai.suggestCommunities(
          {
            intro,
            communities: communities.map((row) => ({
              slug: row.slug,
              name: row.name,
              description: row.description,
            })),
          },
          {
            spaceId: space.id,
            userId,
            ...(membership ? { refType: 'membership', refId: membership.id } : {}),
          },
        );
        const seen = new Set<string>();
        const suggestions: CommunitySuggestion[] = [];
        for (const suggestion of output.suggestions) {
          const community = bySlug.get(suggestion.slug);
          if (!community || seen.has(community.id)) continue;
          seen.add(community.id);
          suggestions.push({
            communityId: community.id,
            slug: community.slug,
            confidence: Math.round(clamp(Number(suggestion.confidence), 0, 1) * 100) / 100,
          });
        }
        suggestions.sort((a, b) => b.confidence - a.confidence);
        return { available: true, suggestions };
      } catch (error) {
        if (isAiUnavailable(error)) {
          log.info(
            { reason: error.reason, spaceId: space.id },
            'community suggestions unavailable',
          );
        } else {
          log.error({ err: error, spaceId: space.id }, 'community suggestions failed');
        }
        return { available: false, suggestions: [] };
      }
    },

    /**
     * POST /api/spaces/:handle/join: creates the member membership and joins the communities in
     * one transaction (member_count in sync). Already a member (including the owner or a
     * pitch-only membership): adds any new communities. A member who left joins again like a new
     * one; members the owner removed: 403.
     */
    async join(handle: string, userId: string, input: JoinBody): Promise<JoinResponse> {
      const space = await access.spaceByHandle(handle);
      const active = await activeCommunities(space.id);
      const communityIds = [...new Set(input.communityIds)];
      assertKnownCommunities(communityIds, active);
      const intro = nullableText(input.intro);

      const { membership, created, priorIntro } = await db.transaction(async (tx) => {
        const result = await repos.memberships.insertOrGet(
          { spaceId: space.id, userId, role: 'member', intro },
          tx,
        );
        let row = result.row;
        let created = result.created;
        const priorIntro = row.intro;
        const back = await reactivateMembership(repos, space.id, row, tx);
        if (back.rejoined) {
          row = back.row;
          created = true;
        }
        if (intro !== null && intro !== row.intro) {
          row = (await repos.memberships.update(space.id, row.id, { intro }, tx)) ?? row;
        }
        await repos.memberships.addCommunities(space.id, row.id, communityIds, tx);
        return { membership: row, created, priorIntro };
      });
      if (created) log.info({ spaceId: space.id, membershipId: membership.id }, 'member joined');
      // New member, or a returning one whose intro just changed.
      if (membership.role === 'member' && (created || (intro !== null && intro !== priorIntro))) {
        embedProfile(space.id, membership);
      }
      // On every member join, not only `created`: a fan who pitched first already holds a
      // membership. A no-op once linked; never throws.
      if (membership.role === 'member') {
        await deps.followers.linkMembership(space.id, membership.id, userId);
      }

      const own = await ownMembership(membership);
      const joined = new Set(own.communityIds);
      const first =
        [...active.values()].find((row) => joined.has(row.id)) ?? active.get(communityIds[0] ?? '');
      return {
        membership: own,
        firstCommunitySlug: first?.slug ?? '',
        alreadyMember: !created,
      };
    },

    /**
     * GET /api/spaces/:handle/me: own posts (not deleted or hidden), teams, pitches with the
     * creator's replies, and the caps left today. A pitch-only membership is valid here.
     */
    async me(ctx: MemberContext): Promise<MySpace> {
      const { space, membership } = ctx;
      const [own, communities, authored, teamRows, pitches, postsLeft, pitchesLeft] =
        await Promise.all([
          ownMembership(membership),
          repos.communities.listBySpace(space.id),
          repos.posts.listByAuthor(space.id, membership.id),
          repos.teams.listByMembership(space.id, membership.id),
          repos.pitches.listBySender(space.id, membership.id),
          limits.leftToday('posts', space.id, membership.id),
          limits.leftToday('pitches', space.id, membership.id),
        ]);

      const answeredGroups = await repos.pitches.answeredGroups(pitches.map((row) => row.id));
      const authoredIds = new Set(authored.map((row) => row.id));
      const teamPosts = await repos.posts.findManyByIds(
        space.id,
        teamRows.map((row) => row.postId).filter((id) => !authoredIds.has(id)),
      );
      const visible = (row: PostRow) => row.deletedAt === null && row.hiddenAt === null;
      const rows = [...authored, ...teamPosts].filter(visible);
      const cards = await posts.buildCards(space, rows, membership);
      const cardById = new Map<string, PostCard>(cards.map((card) => [card.id, card]));
      const joined = new Set(own.communityIds);

      return {
        space: {
          handle: space.handle,
          displayName: space.displayName,
          avatarUrl: space.avatarUrl,
          showReadReceipts: space.showReadReceipts,
        },
        membership: own,
        communities: communities.filter((row) => joined.has(row.id)).map(publicCommunity),
        posts: authored.flatMap((row) => {
          const card = cardById.get(row.id);
          return card ? [card] : [];
        }),
        teams: teamRows.flatMap((row) => {
          const card = cardById.get(row.postId);
          return card
            ? [{ post: card, role: row.role, status: row.status, isLead: isLeadRole(row.role) }]
            : [];
        }),
        pitches: pitches.map((row) => {
          const answered = answeredGroups.get(row.id);
          return pitchView(row, {
            showReadReceipts: space.showReadReceipts,
            // Same post href as notifications.service: /<handle>/p/<postId>.
            answeredGroup: answered
              ? {
                  count: answered.count,
                  postHref: `/${encodeURIComponent(space.handle)}/p/${encodeURIComponent(answered.postId)}`,
                }
              : null,
          });
        }),
        caps: { pitchesLeftToday: pitchesLeft, postsLeftToday: postsLeft },
      };
    },

    /**
     * PATCH /api/spaces/:handle/me: own profile. `communityIds` replaces the joined set among
     * active communities (archived ones the member joined are kept), counts in sync.
     */
    async updateMe(ctx: MemberContext, input: UpdateMembershipBody): Promise<OwnMembership> {
      const { space, membership } = ctx;
      const patch: MembershipUpdate = {};
      if (input.headline !== undefined) patch.headline = nullableText(input.headline);
      if (input.intro !== undefined) patch.intro = nullableText(input.intro);
      if (input.skills !== undefined) patch.skills = input.skills;
      if (input.links !== undefined) patch.links = input.links;

      let wanted: string[] | null = null;
      if (input.communityIds !== undefined) {
        const active = await activeCommunities(space.id);
        wanted = [...new Set(input.communityIds)];
        assertKnownCommunities(wanted, active);
        const joined = await repos.memberships.communityIds(membership.id);
        const archivedJoined = joined.filter((id) => !active.has(id));
        wanted = [...wanted, ...archivedJoined];
      }

      const updated = await db.transaction(async (tx) => {
        const row = await repos.memberships.update(space.id, membership.id, patch, tx);
        if (wanted) await repos.memberships.replaceCommunities(space.id, membership.id, wanted, tx);
        return row;
      });
      if (!updated) throw notFound('Membership');
      if (input.headline !== undefined || input.intro !== undefined || input.skills !== undefined) {
        embedProfile(space.id, updated);
      }
      return ownMembership(updated);
    },

    /** DELETE /api/studio/people/:membershipId: the owner removes a member (never the owner). */
    async remove(owner: OwnerContext, membershipId: string): Promise<void> {
      const target = await repos.memberships.findById(owner.space.id, membershipId);
      if (!target) throw notFound('Member');
      if (target.role === 'owner') throw forbidden("The space owner can't be removed");
      if (target.removedAt) return;
      await repos.memberships.remove(owner.space.id, target.id);
      log.info({ spaceId: owner.space.id, membershipId }, 'member removed');
    },

    /**
     * PUT /api/studio/people/:membershipId/communities: the owner moves a member. Replaces the
     * member's active communities (archived ones they joined are kept), counts in sync.
     * 404 unknown or removed membership, 403 the owner's own membership, 400 unknown or archived
     * community.
     */
    async setCommunities(
      owner: OwnerContext,
      membershipId: string,
      communityIds: string[],
    ): Promise<PersonRow> {
      const { space } = owner;
      const target = await repos.memberships.findById(space.id, membershipId);
      if (!target || target.removedAt) throw notFound('Member');
      if (target.role === 'owner') throw forbidden('Move members, not yourself');
      const active = await activeCommunities(space.id);
      const wanted = [...new Set(communityIds)];
      assertKnownCommunities(wanted, active);
      const joined = await repos.memberships.communityIds(target.id);
      const archivedJoined = joined.filter((id) => !active.has(id));

      await db.transaction((tx) =>
        repos.memberships.replaceCommunities(
          space.id,
          target.id,
          [...wanted, ...archivedJoined],
          tx,
        ),
      );
      log.info({ spaceId: space.id, membershipId }, 'member moved');

      const [rows, scores] = await Promise.all([
        repos.memberships.peopleByIds(space.id, [target.id]),
        deps.discovery.risingScores(space.id),
      ]);
      const [person] = await deps.discovery.toPersonRows(
        rows,
        new Map(scores.map((entry) => [entry.membershipId, entry.score])),
      );
      if (!person) throw notFound('Member');
      return person;
    },
  };
}

export type MembershipsService = ReturnType<typeof createMembershipsService>;
