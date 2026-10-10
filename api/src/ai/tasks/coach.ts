import { notImplemented } from '../../lib/errors.js';
import type { AiRuntime } from '../run.js';
import type { AiContext, CoachInput, CoachOutput } from '../types.js';

/** F30 Idea Coach (fast tier). Stub: F02 writes the prompt, schema and checks. */
export async function coach(
  _rt: AiRuntime,
  _input: CoachInput,
  _ctx: AiContext,
): Promise<CoachOutput> {
  throw notImplemented('Idea Coach');
}
