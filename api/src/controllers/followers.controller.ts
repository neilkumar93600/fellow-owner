import {
  autoTagFollowersSchema,
  createFollowerSchema,
  followersQuerySchema,
  idParamsSchema,
  importFollowersSchema,
  tagFollowersSchema,
  updateFollowerSchema,
} from '@fellow-owners/shared';
import type { Request, Response } from 'express';
import { sessionOf } from '../middlewares/require-session.js';
import { bodyOf, paramsOf, queryOf } from '../middlewares/validate.js';
import type { AccessService, OwnerContext } from '../services/access.service.js';
import type { FollowersService } from '../services/followers.service.js';

/** /api/studio/followers/*: the owner's follower roster, resolved by requireOwner. */
export function createFollowersController(deps: {
  access: AccessService;
  followers: FollowersService;
}) {
  const ownerOf = (req: Request): OwnerContext =>
    deps.access.assertOwner({
      userId: sessionOf(req).user.id,
      space: req.space,
      membership: req.membership,
    });

  return {
    /** GET / -> FollowersPage */
    async list(req: Request, res: Response): Promise<void> {
      res.json(await deps.followers.list(ownerOf(req), queryOf(req, followersQuerySchema)));
    },

    /** POST / -> Follower (201) */
    async create(req: Request, res: Response): Promise<void> {
      const follower = await deps.followers.create(ownerOf(req), bodyOf(req, createFollowerSchema));
      res.status(201).json(follower);
    },

    /** PATCH /:id -> Follower */
    async update(req: Request, res: Response): Promise<void> {
      const { id } = paramsOf(req, idParamsSchema);
      res.json(await deps.followers.update(ownerOf(req), id, bodyOf(req, updateFollowerSchema)));
    },

    /** DELETE /:id -> 204 */
    async remove(req: Request, res: Response): Promise<void> {
      const { id } = paramsOf(req, idParamsSchema);
      await deps.followers.remove(ownerOf(req), id);
      res.status(204).end();
    },

    /** POST /import -> ImportResult (201) */
    async importFollowers(req: Request, res: Response): Promise<void> {
      const result = await deps.followers.importFollowers(
        ownerOf(req),
        bodyOf(req, importFollowersSchema),
      );
      res.status(201).json(result);
    },

    /** POST /tag -> TagFollowersResult */
    async tag(req: Request, res: Response): Promise<void> {
      res.json(await deps.followers.tag(ownerOf(req), bodyOf(req, tagFollowersSchema)));
    },

    /** POST /auto-tag -> AutoTagResult */
    async autoTag(req: Request, res: Response): Promise<void> {
      res.json(await deps.followers.autoTag(ownerOf(req), bodyOf(req, autoTagFollowersSchema)));
    },
  };
}

export type FollowersController = ReturnType<typeof createFollowersController>;
