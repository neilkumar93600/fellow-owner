import {
  commentIdParamsSchema,
  commentModerationSchema,
  createReportSchema,
  handleParamsSchema,
  idParamsSchema,
  postCommentParamsSchema,
  postIdParamsSchema,
  reportActionSchema,
  reportsQuerySchema,
} from '@fellow-owners/shared';
import type { Request, Response } from 'express';
import { spaceOf } from '../middlewares/require-member.js';
import { userIdOf } from '../middlewares/require-session.js';
import { bodyOf, paramsOf, queryOf } from '../middlewares/validate.js';
import type { ModerationService } from '../services/moderation.service.js';

/** F25 moderation: member reports, leaving, and the owner's queue + comment hide. */
export function createModerationController(deps: { moderation: ModerationService }) {
  const { moderation } = deps;
  return {
    /** POST /api/posts/:postId/report -> 204 */
    async reportPost(req: Request, res: Response): Promise<void> {
      const { postId } = paramsOf(req, postIdParamsSchema);
      await moderation.reportPost(userIdOf(req), postId, bodyOf(req, createReportSchema));
      res.status(204).end();
    },
    /** POST /api/comments/:commentId/report -> 204 */
    async reportComment(req: Request, res: Response): Promise<void> {
      const { commentId } = paramsOf(req, commentIdParamsSchema);
      await moderation.reportComment(userIdOf(req), commentId, bodyOf(req, createReportSchema));
      res.status(204).end();
    },
    /** DELETE /api/spaces/:handle/me -> 204 */
    async leave(req: Request, res: Response): Promise<void> {
      const { handle } = paramsOf(req, handleParamsSchema);
      await moderation.leave(handle, userIdOf(req));
      res.status(204).end();
    },
    /** GET /api/studio/reports -> ReportsPage */
    async listReports(req: Request, res: Response): Promise<void> {
      res.json(await moderation.listReports(spaceOf(req).id, queryOf(req, reportsQuerySchema)));
    },
    /** PATCH /api/studio/reports/:id -> ReportItem */
    async actOnReport(req: Request, res: Response): Promise<void> {
      const { id } = paramsOf(req, idParamsSchema);
      const input = bodyOf(req, reportActionSchema);
      res.json(await moderation.actOnReport(spaceOf(req).id, userIdOf(req), id, input));
    },
    /** PATCH /api/studio/posts/:postId/comments/:commentId -> 204 */
    async moderateComment(req: Request, res: Response): Promise<void> {
      const { postId, commentId } = paramsOf(req, postCommentParamsSchema);
      const input = bodyOf(req, commentModerationSchema);
      await moderation.moderateComment(spaceOf(req).id, postId, commentId, input);
      res.status(204).end();
    },
  };
}

export type ModerationController = ReturnType<typeof createModerationController>;
