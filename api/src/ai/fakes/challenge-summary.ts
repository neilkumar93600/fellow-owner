import { notImplemented } from '../../lib/errors.js';
import type { ChallengeSummaryInput, ChallengeSummaryOutput } from '../types.js';

/** Deterministic challenge summary. Stub: F04 fills it. */
export function fakeChallengeSummary(_input: ChallengeSummaryInput): ChallengeSummaryOutput {
  throw notImplemented('Challenge summary (fake)');
}
