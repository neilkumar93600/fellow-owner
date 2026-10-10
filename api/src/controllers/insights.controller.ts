import { communityActivityQuerySchema, exportParamsSchema } from '@fellow-owners/shared';
import type { Request, Response } from 'express';
import { utcDayString } from '../lib/dates.js';
import { sessionOf } from '../middlewares/require-session.js';
import { paramsOf, queryOf } from '../middlewares/validate.js';
import type { AccessService, OwnerContext } from '../services/access.service.js';
import type { InsightsService } from '../services/insights.service.js';

/** /api/studio/analytics/* and /api/studio/export/*: the owner's insights. */
export function createInsightsController(deps: {
  access: AccessService;
  insights: InsightsService;
}) {
  const ownerOf = (req: Request): OwnerContext =>
    deps.access.assertOwner({
      userId: sessionOf(req).user.id,
      space: req.space,
      membership: req.membership,
    });

  return {
    /** GET /analytics/communities?days= -> CommunityActivityReport */
    async communityActivity(req: Request, res: Response): Promise<void> {
      res.json(
        await deps.insights.communityActivity(
          ownerOf(req),
          queryOf(req, communityActivityQuerySchema),
        ),
      );
    },

    /** GET /export/:kind -> text/csv attachment, e.g. mira-followers-2026-10-06.csv */
    async exportCsv(req: Request, res: Response): Promise<void> {
      const owner = ownerOf(req);
      const { kind } = paramsOf(req, exportParamsSchema);
      const csv = await deps.insights.exportCsv(owner, kind);
      res.attachment(`${owner.space.handle}-${kind}-${utcDayString()}.csv`);
      res.type('text/csv; charset=utf-8');
      // The BOM makes Excel read the file as UTF-8 (names with accents, emoji).
      res.send(`﻿${csv}`);
    },
  };
}

export type InsightsController = ReturnType<typeof createInsightsController>;
