import {
  communityParamsSchema,
  createPitchSchema,
  createPostSchema,
  feedQuerySchema,
  handleParamsSchema,
  joinSpaceSchema,
  suggestCommunitiesSchema,
  updateMembershipSchema,
} from '@fellow-owners/shared';
import type { Request, Response } from 'express';
import { spaceOf } from '../middlewares/require-member.js';
import { userIdOf } from '../middlewares/require-session.js';
import { bodyOf, paramsOf, queryOf } from '../middlewares/validate.js';
import type { AccessService, MemberContext } from '../services/access.service.js';
import type { MembershipsService } from '../services/memberships.service.js';
import type { PitchesService } from '../services/pitches.service.js';
import type { PostsService } from '../services/posts.service.js';

export interface SpacesControllerDeps {
  access: AccessService;
  memberships: MembershipsService;
  posts: PostsService;
  pitches: PitchesService;
}

/** The member context resolved by requireMember (re-checked by the access service). */
export function memberContextOf(access: AccessService, req: Request): MemberContext {
  return access.assertMember({
    userId: userIdOf(req),
    space: spaceOf(req),
    membership: req.membership,
  });
}

/** /api/spaces/:handle/* member side: membership, join, me, feeds, new post, pitch. */
export function createSpacesController(deps: SpacesControllerDeps) {
  const { access } = deps;

  return {
    /** GET /:handle/membership -> ViewerMembership (signed out allowed). */
    async membership(req: Request, res: Response): Promise<void> {
      const { handle } = paramsOf(req, handleParamsSchema);
      res.json(await deps.memberships.viewer(handle, req.session?.user.id ?? null));
    },

    /** POST /:handle/suggest-communities -> SuggestCommunitiesResponse */
    async suggestCommunities(req: Request, res: Response): Promise<void> {
      const { handle } = paramsOf(req, handleParamsSchema);
      const { intro } = bodyOf(req, suggestCommunitiesSchema);
      res.json(await deps.memberships.suggest(handle, userIdOf(req), intro));
    },

    /** POST /:handle/join -> JoinResponse */
    async join(req: Request, res: Response): Promise<void> {
      const { handle } = paramsOf(req, handleParamsSchema);
      res.json(await deps.memberships.join(handle, userIdOf(req), bodyOf(req, joinSpaceSchema)));
    },

    /** GET /:handle/me -> MySpace */
    async me(req: Request, res: Response): Promise<void> {
      res.json(await deps.memberships.me(memberContextOf(access, req)));
    },

    /** PATCH /:handle/me -> OwnMembership */
    async updateMe(req: Request, res: Response): Promise<void> {
      const ctx = memberContextOf(access, req);
      res.json(await deps.memberships.updateMe(ctx, bodyOf(req, updateMembershipSchema)));
    },

    /** GET /:handle/communities/:slug/posts -> FeedPage (locked for non-members). */
    async feed(req: Request, res: Response): Promise<void> {
      const { handle, slug } = paramsOf(req, communityParamsSchema);
      const space = await access.spaceByHandle(handle);
      res.json(await deps.posts.feed(space, slug, userIdOf(req), queryOf(req, feedQuerySchema)));
    },

    /** POST /:handle/posts -> PostDetail (201) */
    async createPost(req: Request, res: Response): Promise<void> {
      const ctx = memberContextOf(access, req);
      res.status(201).json(await deps.posts.create(ctx, bodyOf(req, createPostSchema)));
    },

    /** POST /:handle/pitches -> Pitch (201) */
    async createPitch(req: Request, res: Response): Promise<void> {
      const { handle } = paramsOf(req, handleParamsSchema);
      const pitch = await deps.pitches.create(
        handle,
        userIdOf(req),
        bodyOf(req, createPitchSchema),
      );
      res.status(201).json(pitch);
    },
  };
}

export type SpacesController = ReturnType<typeof createSpacesController>;
