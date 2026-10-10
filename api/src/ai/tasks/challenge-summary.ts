import { notImplemented } from '../../lib/errors.js';
import type { AiRuntime } from '../run.js';
import type { AiContext, ChallengeSummaryInput, ChallengeSummaryOutput } from '../types.js';

/** Challenge close summary (fast tier). Stub: F04 writes the prompt and schema. */
export async function challengeSummary(
  _rt: AiRuntime,
  _input: ChallengeSummaryInput,
  _ctx: AiContext,
): Promise<ChallengeSummaryOutput> {
  throw notImplemented('Challenge summary');
}
