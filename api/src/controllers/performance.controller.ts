import { performancePostsQuerySchema, performanceQuerySchema } from '@fellow-owners/shared';
import type { Request, Response } from 'express';
import { spaceOf } from '../middlewares/require-member.js';
import { queryOf } from '../middlewares/validate.js';
import type { PerformanceService } from '../services/performance.service.js';

/** /api/spaces/:handle/performance and /profile-score (owner; requireSpaceOwner set req.space). */
export function createPerformanceController(deps: { performance: PerformanceService }) {
  return {
    /** GET /:handle/performance -> PerformanceSummary */
    async summary(req: Request, res: Response): Promise<void> {
      res.json(await deps.performance.summary(spaceOf(req), queryOf(req, performanceQuerySchema)));
    },

    /** GET /:handle/performance/posts -> PerformancePostsPage */
    async posts(req: Request, res: Response): Promise<void> {
      res.json(
        await deps.performance.posts(spaceOf(req), queryOf(req, performancePostsQuerySchema)),
      );
    },

    /** GET /:handle/profile-score -> ProfileScore */
    async profileScore(req: Request, res: Response): Promise<void> {
      res.json(await deps.performance.profileScore(spaceOf(req)));
    },
  };
}

export type PerformanceController = ReturnType<typeof createPerformanceController>;
