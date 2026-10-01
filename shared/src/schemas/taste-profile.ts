import { z } from 'zod';
import { FEEDBACK_REF_TYPES, FEEDBACK_VERDICTS } from '../enums.js';
import { LIMITS } from '../limits.js';

const { tasteProfile: T } = LIMITS;

const tasteLine = z
  .string()
  .trim()
  .min(1, 'Remove empty lines')
  .max(T.lineMax, `Keep each line under ${T.lineMax} characters`);

const voiceSample = z
  .string()
  .trim()
  .min(1, 'Remove empty samples')
  .max(T.voiceSampleMax, `Keep each sample under ${T.voiceSampleMax} characters`);

/** The creator's own words on what they would and would never promote, plus voice samples. */
export const tasteProfileSchema = z.object({
  promote: z
    .array(tasteLine)
    .min(T.promote.min, 'Add at least one thing you would promote')
    .max(T.promote.max, `Up to ${T.promote.max} lines`),
  never: z.array(tasteLine).max(T.never.max, `Up to ${T.never.max} lines`),
  voice: z.array(voiceSample).max(T.voice.max, `Up to ${T.voice.max} samples`),
});
export type TasteProfileInput = z.input<typeof tasteProfileSchema>;

/** POST /api/studio/feedback: thumbs up or down on an AI pick. `null` clears the vote. */
export const aiFeedbackSchema = z.object({
  refType: z.enum(FEEDBACK_REF_TYPES),
  /** Item id, or `{digestId}:{index}` for a briefing highlight. */
  refId: z.string().trim().min(1).max(100),
  verdict: z.enum(FEEDBACK_VERDICTS).nullable(),
});
export type AiFeedbackInput = z.input<typeof aiFeedbackSchema>;
