import {
  backProjectSchema,
  createPollSchema,
  createProjectUpdateSchema,
  handlePostParamsSchema,
  idParamsSchema,
  pollVoteSchema,
  projectUpdateParamsSchema,
  projectUpdatesQuerySchema,
} from '@fellow-owners/shared';
import type { Request, Response } from 'express';
import { userIdOf } from '../middlewares/require-session.js';
import { bodyOf, paramsOf, queryOf } from '../middlewares/validate.js';
import type { AccessService, OwnerContext } from '../services/access.service.js';
import type { CollabService } from '../services/collab.service.js';

/**
 * F4 Fan collaboration: /api/posts/:id/{poll,updates,feedback-wanted,follow} (members; access is
 * checked in the service) and /api/spaces/:handle/posts/:postId/back (owner, requireSpaceOwner).
 */
export function createCollabController(deps: { access: AccessService; collab: CollabService }) {
  const postIdOf = (req: Request) => paramsOf(req, idParamsSchema).id;
  const ownerOf = (req: Request): OwnerContext =>
    deps.access.assertOwner({
      userId: userIdOf(req),
      space: req.space,
      membership: req.membership,
    });

  return {
    /** GET /api/posts/:id/poll -> Poll */
    async getPoll(req: Request, res: Response): Promise<void> {
      res.json(await deps.collab.getPoll(postIdOf(req), userIdOf(req)));
    },

    /** POST /api/posts/:id/poll -> Poll (201) */
    async createPoll(req: Request, res: Response): Promise<void> {
      const poll = await deps.collab.createPoll(
        postIdOf(req),
        userIdOf(req),
        bodyOf(req, createPollSchema),
      );
      res.status(201).json(poll);
    },

    /** PUT /api/posts/:id/poll/vote -> Poll */
    async vote(req: Request, res: Response): Promise<void> {
      res.json(await deps.collab.vote(postIdOf(req), userIdOf(req), bodyOf(req, pollVoteSchema)));
    },

    /** POST /api/posts/:id/poll/close -> Poll */
    async closePoll(req: Request, res: Response): Promise<void> {
      res.json(await deps.collab.closePoll(postIdOf(req), userIdOf(req)));
    },

    /** GET /api/posts/:id/updates?before=&limit= -> ProjectUpdatesPage */
    async listUpdates(req: Request, res: Response): Promise<void> {
      res.json(
        await deps.collab.listUpdates(
          postIdOf(req),
          userIdOf(req),
          queryOf(req, projectUpdatesQuerySchema),
        ),
      );
    },

    /** POST /api/posts/:id/updates -> ProjectUpdate (201) */
    async createUpdate(req: Request, res: Response): Promise<void> {
      const update = await deps.collab.createUpdate(
        postIdOf(req),
        userIdOf(req),
        bodyOf(req, createProjectUpdateSchema),
      );
      res.status(201).json(update);
    },

    /** DELETE /api/posts/:id/updates/:updateId -> 204 */
    async deleteUpdate(req: Request, res: Response): Promise<void> {
      const { id, updateId } = paramsOf(req, projectUpdateParamsSchema);
      await deps.collab.deleteUpdate(id, updateId, userIdOf(req));
      res.status(204).end();
    },

    /** PUT /api/posts/:id/feedback-wanted -> FeedbackWantedState */
    async wantFeedback(req: Request, res: Response): Promise<void> {
      res.json(await deps.collab.setFeedbackWanted(postIdOf(req), userIdOf(req), true));
    },

    /** DELETE /api/posts/:id/feedback-wanted -> FeedbackWantedState */
    async stopFeedback(req: Request, res: Response): Promise<void> {
      res.json(await deps.collab.setFeedbackWanted(postIdOf(req), userIdOf(req), false));
    },

    /** PUT /api/posts/:id/follow -> FollowState */
    async follow(req: Request, res: Response): Promise<void> {
      res.json(await deps.collab.setFollowing(postIdOf(req), userIdOf(req), true));
    },

    /** DELETE /api/posts/:id/follow -> FollowState */
    async unfollow(req: Request, res: Response): Promise<void> {
      res.json(await deps.collab.setFollowing(postIdOf(req), userIdOf(req), false));
    },

    /** PUT /api/spaces/:handle/posts/:postId/back -> BackingState */
    async back(req: Request, res: Response): Promise<void> {
      const { postId } = paramsOf(req, handlePostParamsSchema);
      res.json(await deps.collab.back(ownerOf(req), postId, bodyOf(req, backProjectSchema)));
    },

    /** DELETE /api/spaces/:handle/posts/:postId/back -> BackingState */
    async unback(req: Request, res: Response): Promise<void> {
      const { postId } = paramsOf(req, handlePostParamsSchema);
      res.json(await deps.collab.unback(ownerOf(req), postId));
    },
  };
}

export type CollabController = ReturnType<typeof createCollabController>;
