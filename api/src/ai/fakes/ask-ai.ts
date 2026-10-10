import type { AskAiInput, AskAiOutput } from '../types.js';

/** How many of the best matches the fake answer cites. */
const FAKE_CITED = 3;

/**
 * Deterministic Ask your AI answer citing only the given matches (best first, up to 3). Inline
 * markers [1], [2] ... index into `citations`, like the live task's normalized output.
 */
export function fakeAskAi(input: AskAiInput): AskAiOutput {
  const cited = input.matches.slice(0, FAKE_CITED);
  if (cited.length === 0) {
    return {
      answer: 'Nothing in your space answers that yet.',
      citations: [],
      model: 'fake',
    };
  }
  const lines = cited.map((match, index) => `"${match.title}" [${index + 1}]`);
  return {
    answer: `The closest things in your space: ${lines.join(', ')}.`,
    citations: cited.map(({ refType, refId, title }) => ({ refType, refId, title })),
    model: 'fake',
  };
}
