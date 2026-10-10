import { z } from 'zod';
import { SNOOZE_REF_TYPES } from '../enums.js';
import { idSchema } from './space.js';

/** POST /api/studio/snoozes: hide a pitch or post from Today's decision cards for `days`. */
export const snoozeSchema = z.object({
  refType: z.enum(SNOOZE_REF_TYPES),
  refId: idSchema,
  days: z.int().min(1).max(14).default(1),
});
export type SnoozeInput = z.input<typeof snoozeSchema>;

/** DELETE /api/studio/snoozes/:refType/:refId */
export const snoozeParamsSchema = z.object({
  refType: z.enum(SNOOZE_REF_TYPES),
  refId: idSchema,
});

/** POST /api/studio/checklist: a setup step the API cannot observe on its own. */
export const checklistStepSchema = z.object({ step: z.literal('bio_link_shared') });
export type ChecklistStepInput = z.input<typeof checklistStepSchema>;
