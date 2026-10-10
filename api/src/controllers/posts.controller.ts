import {
  commentParamsSchema,
  createCommentSchema,
  idParamsSchema,
  signalParamsSchema,
  teamDecisionSchema,
  teamParamsSchema,
  teamRequestSchema,
  updatePostSchema,
} from '@fellow-owners/shared';
import type { Request, Response } from 'express';
import { userIdOf } from '../middlewares/require-session.js';
import { bodyOf, paramsOf } from '../middlewares/validate.js';
import type { CommentsService } from '../services/comments.service.js';
import type { PostsService } from '../services/posts.service.js';
import type { SignalsService } from '../services/signals.service.js';
import type { TeamsService } from '../services/teams.service.js';

export interface PostsControllerDeps {
  posts: PostsService;
  comments: CommentsService;
  signals: SignalsService;
  teams: TeamsService;
}

/**
 * /api/posts/:id/*: the space is resolved from the post, then the caller's membership
 * (services/access.service.ts requirePostAccess): 404 unknown/deleted/hidden, 403 non-members.
 */
export function createPostsController(deps: PostsControllerDeps) {
  return {
    /** GET /:id -> PostDetail */
    async detail(req: Request, res: Response): Promise<void> {
      const { id } = paramsOf(req, idParamsSchema);
      res.json(await deps.posts.detail(id, userIdOf(req)));
    },

    /** PATCH /:id -> PostDetail (author; content within 24 h, status any time) */
    async update(req: Request, res: Response): Promise<void> {
      const { id } = paramsOf(req, idParamsSchema);
      res.json(await deps.posts.update(id, userIdOf(req), bodyOf(req, updatePostSchema)));
    },

    /** DELETE /:id -> 204 (author, soft delete) */
    async remove(req: Request, res: Response): Promise<void> {
      const { id } = paramsOf(req, idParamsSchema);
      await deps.posts.remove(id, userIdOf(req));
      res.status(204).end();
    },

    /** POST /:id/comments -> CommentItem (201) */
    async createComment(req: Request, res: Response): Promise<void> {
      const { id } = paramsOf(req, idParamsSchema);
      const { body } = bodyOf(req, createCommentSchema);
      res.status(201).json(await deps.comments.create(id, userIdOf(req), body));
    },

    /** DELETE /:id/comments/:commentId -> 204 (comment author) */
    async deleteComment(req: Request, res: Response): Promise<void> {
      const { id, commentId } = paramsOf(req, commentParamsSchema);
      await deps.comments.remove(id, commentId, userIdOf(req));
      res.status(204).end();
    },

    /** PUT /:id/signals/:kind -> SignalState */
    async addSignal(req: Request, res: Response): Promise<void> {
      const { id, kind } = paramsOf(req, signalParamsSchema);
      res.json(await deps.signals.add(id, userIdOf(req), kind));
    },

    /** DELETE /:id/signals/:kind -> SignalState */
    async removeSignal(req: Request, res: Response): Promise<void> {
      const { id, kind } = paramsOf(req, signalParamsSchema);
      res.json(await deps.signals.remove(id, userIdOf(req), kind));
    },

    /** POST /:id/team -> PostDetail */
    async requestTeam(req: Request, res: Response): Promise<void> {
      const { id } = paramsOf(req, idParamsSchema);
      const { role } = bodyOf(req, teamRequestSchema);
      res.json(await deps.teams.request(id, userIdOf(req), role));
    },

    /** PATCH /:id/team/:membershipId -> PostDetail (project author) */
    async decideTeam(req: Request, res: Response): Promise<void> {
      const { id, membershipId } = paramsOf(req, teamParamsSchema);
      const { status } = bodyOf(req, teamDecisionSchema);
      res.json(await deps.teams.decide(id, userIdOf(req), membershipId, status));
    },
  };
}

export type PostsController = ReturnType<typeof createPostsController>;
