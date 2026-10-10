import { trimLine } from '../guard.js';
import { CHALLENGE_SUMMARY_MAX } from '../tasks/challenge-summary.js';
import type { ChallengeSummaryInput, ChallengeSummaryOutput } from '../types.js';

/** Deterministic challenge summary: the entry count and the first entry's title. */
export function fakeChallengeSummary(input: ChallengeSummaryInput): ChallengeSummaryOutput {
  const n = input.entries.length;
  const first = input.entries[0];
  return {
    summary: trimLine(
      `${n} ${n === 1 ? 'entry' : 'entries'} to "${input.title}"${first ? `, starting with "${first.title}"` : ''}.`,
      CHALLENGE_SUMMARY_MAX,
    ),
  };
}
