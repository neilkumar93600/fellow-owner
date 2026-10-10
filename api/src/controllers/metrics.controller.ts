import { handleParamsSchema, metricsQuerySchema } from '@fellow-owners/shared';
import type { Request, Response } from 'express';
import { spaceOf } from '../middlewares/require-member.js';
import { paramsOf, queryOf } from '../middlewares/validate.js';
import type { MetricsService } from '../services/metrics.service.js';

/** POST /api/spaces/:handle/visit (public beacon) and GET /api/studio/metrics (owner). */
export function createMetricsController(deps: { metrics: MetricsService }) {
  return {
    /** -> 204 */
    async visit(req: Request, res: Response): Promise<void> {
      const { handle } = paramsOf(req, handleParamsSchema);
      await deps.metrics.recordVisit(handle, {
        ip: req.ip ?? 'unknown',
        userAgent: req.get('user-agent') ?? null,
      });
      res.status(204).end();
    },
    /** -> StudioMetrics */
    async studio(req: Request, res: Response): Promise<void> {
      const query = queryOf(req, metricsQuerySchema);
      res.json(await deps.metrics.studioMetrics(spaceOf(req).id, query));
    },
  };
}

export type MetricsController = ReturnType<typeof createMetricsController>;
