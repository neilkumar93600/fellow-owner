import { z } from 'zod';
import { LIMITS } from '../limits.js';

/** POST /api/studio/ask (F13 Ask your AI). Not the challenge schemas, which live in ask.ts. */
export const askAiRequestSchema = z.object({
  question: z
    .string()
    .trim()
    .min(3, 'Ask a question')
    .max(LIMITS.ask.questionMax, `Up to ${LIMITS.ask.questionMax} characters`),
});
export type AskAiRequestInput = z.input<typeof askAiRequestSchema>;
