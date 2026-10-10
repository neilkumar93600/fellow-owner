import { checklistStepSchema, snoozeParamsSchema, snoozeSchema } from '@fellow-owners/shared';
import type { Request, Response } from 'express';
import { spaceOf } from '../middlewares/require-member.js';
import { bodyOf, paramsOf } from '../middlewares/validate.js';
import type { SnoozesService } from '../services/snoozes.service.js';

/** /api/studio/snoozes and /api/studio/checklist (owner). */
export function createSnoozesController(deps: { snoozes: SnoozesService }) {
  const { snoozes } = deps;
  return {
    /** POST /api/studio/snoozes -> 204 */
    async snooze(req: Request, res: Response): Promise<void> {
      await snoozes.snooze(spaceOf(req).id, bodyOf(req, snoozeSchema));
      res.status(204).end();
    },
    /** DELETE /api/studio/snoozes/:refType/:refId -> 204 */
    async unsnooze(req: Request, res: Response): Promise<void> {
      const { refType, refId } = paramsOf(req, snoozeParamsSchema);
      await snoozes.unsnooze(spaceOf(req).id, refType, refId);
      res.status(204).end();
    },
    /** POST /api/studio/checklist -> 204 */
    async markChecklistStep(req: Request, res: Response): Promise<void> {
      await snoozes.markChecklistStep(spaceOf(req).id, bodyOf(req, checklistStepSchema));
      res.status(204).end();
    },
  };
}

export type SnoozesController = ReturnType<typeof createSnoozesController>;
