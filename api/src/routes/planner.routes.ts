import {
  bestTimesSchema,
  captionDraftSchema,
  createPlanItemSchema,
  handleIdParamsSchema,
  handleParamsSchema,
  markPlanItemSchema,
  planRangeQuerySchema,
  updatePlanItemSchema,
} from '@fellow-owners/shared';
import { Router } from 'express';
import type { Container } from '../container.js';
import { noStore } from '../lib/http.js';
import { requireSpaceOwner } from '../middlewares/require-owner.js';
import { validate } from '../middlewares/validate.js';

/**
 * F3 Content planner (owner), under /api/spaces/:handle/planner:
 *   GET    /                    ?from=&to=&status=   -> PlanRange
 *   POST   /items                                    -> PlanItem (201)
 *   GET    /items/:id                                -> PlanItem
 *   PATCH  /items/:id                                -> PlanItem
 *   DELETE /items/:id                                -> 204
 *   POST   /items/:id/mark      { status }           -> PlanItem
 *   POST   /best-times          { platforms, tz }    -> BestTimes
 *   POST   /caption-draft       { title, platform }  -> CaptionDraft (AI, capped per space per day)
 * Mounted on /api/spaces before spaces.routes: per-route middleware only.
 */
export function createPlannerRoutes(container: Container): Router {
  const router = Router();
  const { auth, repos } = container;
  const controller = container.controllers.planner;
  const owner = requireSpaceOwner({ auth, spaces: repos.spaces, memberships: repos.memberships });
  const guard = [noStore(), owner];
  const byId = validate({ params: handleIdParamsSchema });

  router.get(
    '/:handle/planner',
    guard,
    validate({ params: handleParamsSchema, query: planRangeQuerySchema }),
    controller.range,
  );
  router.post(
    '/:handle/planner/items',
    guard,
    validate({ params: handleParamsSchema, body: createPlanItemSchema }),
    controller.create,
  );
  router.get('/:handle/planner/items/:id', guard, byId, controller.get);
  router.patch(
    '/:handle/planner/items/:id',
    guard,
    validate({ params: handleIdParamsSchema, body: updatePlanItemSchema }),
    controller.update,
  );
  router.delete('/:handle/planner/items/:id', guard, byId, controller.remove);
  router.post(
    '/:handle/planner/items/:id/mark',
    guard,
    validate({ params: handleIdParamsSchema, body: markPlanItemSchema }),
    controller.mark,
  );
  router.post(
    '/:handle/planner/best-times',
    guard,
    validate({ params: handleParamsSchema, body: bestTimesSchema }),
    controller.bestTimes,
  );
  router.post(
    '/:handle/planner/caption-draft',
    guard,
    validate({ params: handleParamsSchema, body: captionDraftSchema }),
    controller.captionDraft,
  );
  return router;
}
