import { idParamsSchema } from '@fellow-owners/shared';
import type { Request, Response } from 'express';
import { userIdOf } from '../middlewares/require-session.js';
import { paramsOf } from '../middlewares/validate.js';
import type { PitchesService } from '../services/pitches.service.js';

/** /api/pitches/:id: the sender withdraws a pitch while it is `new`. */
export function createPitchesController(deps: { pitches: PitchesService }) {
  return {
    /** PATCH /:id { status: 'withdrawn' } -> Pitch */
    async withdraw(req: Request, res: Response): Promise<void> {
      const { id } = paramsOf(req, idParamsSchema);
      res.json(await deps.pitches.withdraw(id, userIdOf(req)));
    },
  };
}

export type PitchesController = ReturnType<typeof createPitchesController>;
