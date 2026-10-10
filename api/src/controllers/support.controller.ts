import { supportRequestSchema } from '@fellow-owners/shared';
import type { Request, Response } from 'express';
import { bodyOf } from '../middlewares/validate.js';
import type { SupportService } from '../services/support.service.js';

/** POST /api/support/requests (public): contact and privacy forms. */
export function createSupportController(deps: { support: SupportService }) {
  return {
    /** -> 202 {received: true}, always (no enumeration, honeypot dropped silently). */
    async submit(req: Request, res: Response): Promise<void> {
      await deps.support.submit(bodyOf(req, supportRequestSchema), req.session?.user.id ?? null);
      res.status(202).json({ received: true });
    },
  };
}

export type SupportController = ReturnType<typeof createSupportController>;
