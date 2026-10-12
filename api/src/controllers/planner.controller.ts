import {
  bestTimesSchema,
  captionDraftSchema,
  createPlanItemSchema,
  handleIdParamsSchema,
  markPlanItemSchema,
  planRangeQuerySchema,
  updatePlanItemSchema,
} from '@fellow-owners/shared';
import type { Request, Response } from 'express';
import { userIdOf } from '../middlewares/require-session.js';
import { bodyOf, paramsOf, queryOf } from '../middlewares/validate.js';
import type { AccessService, OwnerContext } from '../services/access.service.js';
import type { PlannerService } from '../services/planner.service.js';

/** /api/spaces/:handle/planner/* (owner; requireSpaceOwner set req.space). */
export function createPlannerController(deps: { access: AccessService; planner: PlannerService }) {
  const ownerOf = (req: Request): OwnerContext =>
    deps.access.assertOwner({
      userId: userIdOf(req),
      space: req.space,
      membership: req.membership,
    });
  const idOf = (req: Request) => paramsOf(req, handleIdParamsSchema).id;

  return {
    /** GET /:handle/planner?from=&to= -> PlanRange */
    async range(req: Request, res: Response): Promise<void> {
      res.json(await deps.planner.range(ownerOf(req), queryOf(req, planRangeQuerySchema)));
    },

    /** GET /:handle/planner/items/:id -> PlanItem */
    async get(req: Request, res: Response): Promise<void> {
      res.json(await deps.planner.get(ownerOf(req), idOf(req)));
    },

    /** POST /:handle/planner/items -> PlanItem (201) */
    async create(req: Request, res: Response): Promise<void> {
      const item = await deps.planner.create(ownerOf(req), bodyOf(req, createPlanItemSchema));
      res.status(201).json(item);
    },

    /** PATCH /:handle/planner/items/:id -> PlanItem */
    async update(req: Request, res: Response): Promise<void> {
      res.json(
        await deps.planner.update(ownerOf(req), idOf(req), bodyOf(req, updatePlanItemSchema)),
      );
    },

    /** DELETE /:handle/planner/items/:id -> 204 */
    async remove(req: Request, res: Response): Promise<void> {
      await deps.planner.remove(ownerOf(req), idOf(req));
      res.status(204).end();
    },

    /** POST /:handle/planner/items/:id/mark -> PlanItem */
    async mark(req: Request, res: Response): Promise<void> {
      res.json(await deps.planner.mark(ownerOf(req), idOf(req), bodyOf(req, markPlanItemSchema)));
    },

    /** POST /:handle/planner/best-times -> BestTimes */
    async bestTimes(req: Request, res: Response): Promise<void> {
      res.json(await deps.planner.bestTimes(ownerOf(req), bodyOf(req, bestTimesSchema)));
    },

    /** POST /:handle/planner/caption-draft -> CaptionDraft */
    async captionDraft(req: Request, res: Response): Promise<void> {
      res.json(await deps.planner.captionDraft(ownerOf(req), bodyOf(req, captionDraftSchema)));
    },
  };
}

export type PlannerController = ReturnType<typeof createPlannerController>;
