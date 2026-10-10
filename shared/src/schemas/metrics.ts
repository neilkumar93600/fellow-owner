import { z } from 'zod';

/** GET /api/studio/metrics?days=7|30 (default 30). */
export const metricsQuerySchema = z.object({
  days: z.coerce
    .number()
    .pipe(z.literal([7, 30], 'Use 7 or 30'))
    .default(30),
});
export type MetricsQuery = z.output<typeof metricsQuerySchema>;
