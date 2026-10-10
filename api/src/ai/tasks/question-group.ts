import { notImplemented } from '../../lib/errors.js';
import type { AiRuntime } from '../run.js';
import type { AiContext, QuestionGroupInput, QuestionGroupOutput } from '../types.js';

/** F32 Answer Once naming + draft (smart tier). Stub: F01 writes the prompt and schema. */
export async function questionGroup(
  _rt: AiRuntime,
  _input: QuestionGroupInput,
  _ctx: AiContext,
): Promise<QuestionGroupOutput> {
  throw notImplemented('Question grouping');
}
