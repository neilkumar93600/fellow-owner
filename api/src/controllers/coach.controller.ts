import { coachRequestSchema, handleParamsSchema } from '@fellow-owners/shared';
import type { Request, Response } from 'express';
import { userIdOf } from '../middlewares/require-session.js';
import { bodyOf, paramsOf } from '../middlewares/validate.js';
import type { CoachService } from '../services/coach.service.js';

/** POST /api/spaces/:handle/coach (session): F30 Idea Coach. */
export function createCoachController(deps: { coach: CoachService }) {
  return {
    /** -> CoachResult */
    async check(req: Request, res: Response): Promise<void> {
      const { handle } = paramsOf(req, handleParamsSchema);
      res.json(await deps.coach.check(handle, userIdOf(req), bodyOf(req, coachRequestSchema)));
    },
  };
}

export type CoachController = ReturnType<typeof createCoachController>;
