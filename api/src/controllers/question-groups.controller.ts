import {
  answerQuestionGroupSchema,
  idParamsSchema,
  questionGroupAskerParamsSchema,
} from '@fellow-owners/shared';
import type { Request, Response } from 'express';
import { spaceOf } from '../middlewares/require-member.js';
import { userIdOf } from '../middlewares/require-session.js';
import { bodyOf, paramsOf } from '../middlewares/validate.js';
import type { QuestionGroupsService } from '../services/question-groups.service.js';

/** /api/studio/question-groups (owner): F32 Answer Once. */
export function createQuestionGroupsController(deps: { questionGroups: QuestionGroupsService }) {
  const { questionGroups } = deps;
  return {
    /** GET / -> QuestionGroupsPage */
    async list(req: Request, res: Response): Promise<void> {
      res.json(await questionGroups.list(spaceOf(req).id));
    },
    /** POST /:id/answer -> QuestionGroup */
    async answer(req: Request, res: Response): Promise<void> {
      const { id } = paramsOf(req, idParamsSchema);
      const input = bodyOf(req, answerQuestionGroupSchema);
      res.json(await questionGroups.answer(spaceOf(req).id, userIdOf(req), id, input));
    },
    /** POST /:id/redraft -> RedraftResult */
    async redraft(req: Request, res: Response): Promise<void> {
      const { id } = paramsOf(req, idParamsSchema);
      res.json(await questionGroups.redraft(spaceOf(req).id, id));
    },
    /** POST /:id/dismiss -> QuestionGroup */
    async dismiss(req: Request, res: Response): Promise<void> {
      const { id } = paramsOf(req, idParamsSchema);
      res.json(await questionGroups.dismiss(spaceOf(req).id, id));
    },
    /** DELETE /:id/askers/:pitchId -> QuestionGroup */
    async removeAsker(req: Request, res: Response): Promise<void> {
      const { id, pitchId } = paramsOf(req, questionGroupAskerParamsSchema);
      res.json(await questionGroups.removeAsker(spaceOf(req).id, id, pitchId));
    },
  };
}

export type QuestionGroupsController = ReturnType<typeof createQuestionGroupsController>;
