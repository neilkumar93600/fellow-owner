import { askAiRequestSchema } from '@fellow-owners/shared';
import type { Request, Response } from 'express';
import { spaceOf } from '../middlewares/require-member.js';
import { userIdOf } from '../middlewares/require-session.js';
import { bodyOf } from '../middlewares/validate.js';
import type { AskService } from '../services/ask.service.js';

/** POST /api/studio/ask (owner): F13 Ask your AI. */
export function createAskController(deps: { ask: AskService }) {
  return {
    /** -> AskAnswer */
    async ask(req: Request, res: Response): Promise<void> {
      const input = bodyOf(req, askAiRequestSchema);
      res.json(await deps.ask.ask(spaceOf(req).id, userIdOf(req), input));
    },
  };
}

export type AskController = ReturnType<typeof createAskController>;
