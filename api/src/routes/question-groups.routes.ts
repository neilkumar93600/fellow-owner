import {
  answerQuestionGroupSchema,
  idParamsSchema,
  questionGroupAskerParamsSchema,
} from '@fellow-owners/shared';
import { Router } from 'express';
import type { Container } from '../container.js';
import { noStore } from '../lib/http.js';
import { requireOwner } from '../middlewares/require-owner.js';
import { validate } from '../middlewares/validate.js';

/** /api/studio/question-groups (owner): F32 Answer Once. */
export function createQuestionGroupsRoutes(container: Container): Router {
  const router = Router();
  const { auth, repos } = container;
  const controller = container.controllers.questionGroups;
  const byId = validate({ params: idParamsSchema });

  router.use(
    noStore(),
    requireOwner({ auth, spaces: repos.spaces, memberships: repos.memberships }),
  );
  router.get('/', controller.list);
  router.post(
    '/:id/answer',
    validate({ params: idParamsSchema, body: answerQuestionGroupSchema }),
    controller.answer,
  );
  router.post('/:id/redraft', byId, controller.redraft);
  router.post('/:id/dismiss', byId, controller.dismiss);
  router.delete(
    '/:id/askers/:pitchId',
    validate({ params: questionGroupAskerParamsSchema }),
    controller.removeAsker,
  );
  return router;
}
