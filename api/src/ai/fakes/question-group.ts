import { notImplemented } from '../../lib/errors.js';
import type { QuestionGroupInput, QuestionGroupOutput } from '../types.js';

/** Deterministic question naming + draft. Stub: F01 fills it. */
export function fakeQuestionGroup(_input: QuestionGroupInput): QuestionGroupOutput {
  throw notImplemented('Question grouping (fake)');
}
