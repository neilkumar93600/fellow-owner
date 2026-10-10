import { z } from 'zod';
import { ANALYTICS_WINDOWS, EXPORT_KINDS } from '../enums.js';

/** GET /api/studio/analytics/communities?days=7|30 (default 7). */
export const communityActivityQuerySchema = z.object({
  days: z.coerce
    .number()
    .refine((days) => (ANALYTICS_WINDOWS as readonly number[]).includes(days), 'Use 7 or 30')
    .default(7),
});
export type CommunityActivityQuery = z.output<typeof communityActivityQuerySchema>;

/** GET /api/studio/export/:kind -> text/csv */
export const exportParamsSchema = z.object({ kind: z.enum(EXPORT_KINDS) });
export type ExportParams = z.output<typeof exportParamsSchema>;
