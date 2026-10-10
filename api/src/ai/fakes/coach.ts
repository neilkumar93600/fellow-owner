import { notImplemented } from '../../lib/errors.js';
import type { CoachInput, CoachOutput } from '../types.js';

/** Deterministic coach for tests and keyless dev. Stub: F02 fills it. */
export function fakeCoach(_input: CoachInput): CoachOutput {
  throw notImplemented('Idea Coach (fake)');
}
