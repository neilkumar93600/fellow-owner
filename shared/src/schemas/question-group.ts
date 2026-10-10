import { z } from 'zod';
import { pitchReplySchema } from './pitch.js';
import { idSchema } from './space.js';

/**
 * POST /api/studio/question-groups/:id/answer (F32 Answer Once). The answer becomes each asker's
 * creator reply, so it has the pitch reply limits. `pinCommunityIds`: post it, pinned, in these.
 */
export const answerQuestionGroupSchema = z.object({
  answer: pitchReplySchema,
  replyAll: z.boolean(),
  pinCommunityIds: z
    .array(idSchema)
    .max(6)
    .default([])
    .transform((ids) => [...new Set(ids)]),
});
export type AnswerQuestionGroupInput = z.input<typeof answerQuestionGroupSchema>;

/** DELETE /api/studio/question-groups/:id/askers/:pitchId */
export const questionGroupAskerParamsSchema = z.object({ id: idSchema, pitchId: idSchema });
