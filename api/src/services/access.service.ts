import type { MembershipRow } from '../db/schema/memberships.js';
import type { PostRow } from '../db/schema/posts.js';
import type { SpaceRow } from '../db/schema/spaces.js';
import { forbidden, notFound } from '../lib/errors.js';
import type { Repos } from '../repositories/index.js';

/**
 * Who the caller is in a space. Every service call resolves this first (05 §6):
 * - members: an active membership (removed_at null) of that space, owner included
 * - owner: the caller's own space (one per user in the MVP)
 * Guards in middlewares/ (requireMember, requireOwner) resolve the same thing for routes keyed by
 * :handle or the session; the helpers here re-check it and cover routes keyed by an item id.
 */

/** A signed-in member acting in a space. */
export interface MemberContext {
  userId: string;
  space: SpaceRow;
  membership: MembershipRow;
}

/** The owner acting in their own space (studio). `membership` is the owner membership. */
export interface OwnerContext {
  userId: string;
  space: SpaceRow;
  membership: MembershipRow | null;
}

/** A member acting on one post of their space. */
export interface PostAccess extends MemberContext {
  post: PostRow;
}

export function isActiveMembership(
  membership: MembershipRow | null | undefined,
  spaceId: string,
): membership is MembershipRow {
  return Boolean(membership && membership.spaceId === spaceId && membership.removedAt === null);
}

export function isSpaceOwner(space: SpaceRow, userId: string | null | undefined): boolean {
  return Boolean(userId) && space.ownerUserId === userId;
}

export function createAccessService(deps: { repos: Repos }) {
  const { repos } = deps;

  /** 403 unless `membership` is an active membership of `space` belonging to `userId`. */
  function assertMember(ctx: {
    userId: string;
    space: SpaceRow;
    membership: MembershipRow | null;
  }): MemberContext {
    const { membership } = ctx;
    if (!isActiveMembership(membership, ctx.space.id) || membership.userId !== ctx.userId) {
      throw forbidden('Join this space first');
    }
    return { userId: ctx.userId, space: ctx.space, membership };
  }

  /** 404 unless the caller owns `space`. */
  function assertOwner(ctx: {
    userId: string;
    space: SpaceRow | null;
    membership: MembershipRow | null;
  }): OwnerContext {
    if (!ctx.space || !isSpaceOwner(ctx.space, ctx.userId)) throw notFound('Space');
    const membership =
      ctx.membership && ctx.membership.spaceId === ctx.space.id ? ctx.membership : null;
    return { userId: ctx.userId, space: ctx.space, membership };
  }

  /** requireMember for a space: 403 when the caller is not an active member. */
  async function requireMember(space: SpaceRow, userId: string): Promise<MemberContext> {
    const membership = await repos.memberships.findByUser(space.id, userId);
    return assertMember({ userId, space, membership });
  }

  return {
    assertMember,
    assertOwner,
    requireMember,

    /** The space for a public :handle route; 404 when unknown. */
    async spaceByHandle(handle: string): Promise<SpaceRow> {
      const space = await repos.spaces.findByHandle(handle);
      if (!space) throw notFound('Space');
      return space;
    },

    /** The caller's active membership in the space, or null (removed members count as none). */
    async activeMembership(spaceId: string, userId: string): Promise<MembershipRow | null> {
      const membership = await repos.memberships.findByUser(spaceId, userId);
      return isActiveMembership(membership, spaceId) ? membership : null;
    },

    /** requireOwner from the session: the caller's own space, 404 when they have none. */
    async requireOwner(userId: string): Promise<OwnerContext> {
      const space = await repos.spaces.findByOwnerUserId(userId);
      if (!space) throw notFound('Space');
      const membership = await repos.memberships.findByUser(space.id, userId);
      return assertOwner({ userId, space, membership });
    },

    /**
     * /api/posts/:id routes: the post (404 when missing or deleted), then the caller's active
     * membership in the post's space (403), then visibility (hidden posts are 404 for members;
     * the owner reads them through the studio).
     */
    async requirePostAccess(
      postId: string,
      userId: string,
      { allowHidden = false }: { allowHidden?: boolean } = {},
    ): Promise<PostAccess> {
      const post = await repos.posts.findById(postId);
      if (!post || post.deletedAt) throw notFound('Post');
      const space = await repos.spaces.findById(post.spaceId);
      if (!space) throw notFound('Post');
      const member = await requireMember(space, userId);
      if (post.hiddenAt && !allowHidden) throw notFound('Post');
      return { ...member, post };
    },
  };
}

export type AccessService = ReturnType<typeof createAccessService>;
