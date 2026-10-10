import { postIdParamsSchema } from '@fellow-owners/shared';
import type { Request, Response } from 'express';
import { spaceOf } from '../middlewares/require-member.js';
import { userIdOf } from '../middlewares/require-session.js';
import { paramsOf } from '../middlewares/validate.js';
import type { SimilarService } from '../services/similar.service.js';

/** F17 similar ideas + people who could help, on post detail (member and studio). */
export function createSimilarController(deps: { similar: SimilarService }) {
  return {
    /** GET /api/posts/:postId/similar -> SimilarResult */
    async forMember(req: Request, res: Response): Promise<void> {
      const { postId } = paramsOf(req, postIdParamsSchema);
      res.json(await deps.similar.forMember(userIdOf(req), postId));
    },
    /** GET /api/studio/posts/:postId/similar -> SimilarResult */
    async forOwner(req: Request, res: Response): Promise<void> {
      const { postId } = paramsOf(req, postIdParamsSchema);
      res.json(await deps.similar.forOwner(spaceOf(req).id, postId));
    },
  };
}

export type SimilarController = ReturnType<typeof createSimilarController>;
