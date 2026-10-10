import { z } from 'zod';
import { REPORT_REASONS, REPORT_STATUSES } from '../enums.js';
import { LIMITS } from '../limits.js';
import { cursorQuerySchema } from './space.js';

/** POST /api/posts/:postId/report and /api/comments/:commentId/report (F25). */
export const createReportSchema = z.object({
  reason: z.enum(REPORT_REASONS),
  note: z
    .string()
    .trim()
    .max(LIMITS.reports.noteMax, `Up to ${LIMITS.reports.noteMax} characters`)
    .optional(),
});
export type CreateReportInput = z.input<typeof createReportSchema>;

/** PATCH /api/studio/reports/:id. `hide_target` hides the post or comment and resolves. */
export const reportActionSchema = z.object({
  action: z.enum(['resolve', 'dismiss', 'hide_target']),
});
export type ReportActionInput = z.input<typeof reportActionSchema>;

/** GET /api/studio/reports */
export const reportsQuerySchema = cursorQuerySchema.extend({
  status: z.enum(REPORT_STATUSES).optional(),
});
export type ReportsQuery = z.output<typeof reportsQuerySchema>;

/** PATCH /api/studio/posts/:postId/comments/:commentId */
export const commentModerationSchema = z.object({ action: z.enum(['hide', 'unhide']) });
export type CommentModerationInput = z.input<typeof commentModerationSchema>;
