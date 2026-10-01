import { LIMITS } from '@fellow-owners/shared';
import { sanitizeUntrusted, truncateText } from '../guard.js';
import { type AiRuntime, runEmbeddingTask } from '../run.js';
import type { AiContext, Embedding, EmbedInput } from '../types.js';

/**
 * embedItem (embedding tier, 02-trd): one vector(1536) per post or pitch from title + body, for
 * similar ideas, people matching and semantic search (P1). Once per item; content edits clear
 * the stored vector so the analyzer embeds again.
 */

/** text-embedding-3-small accepts ~8k tokens; 8,000 characters keeps us far below. */
export const EMBED_INPUT_MAX_CHARS = 8_000;

/** The text that gets embedded: title, blank line, body; cleaned and cut. */
export function embeddingText(input: EmbedInput): string {
  return truncateText(
    sanitizeUntrusted(`${input.title}\n\n${input.body}`),
    EMBED_INPUT_MAX_CHARS,
    '',
  );
}

export async function embedItem(
  rt: AiRuntime,
  input: EmbedInput,
  ctx: AiContext,
): Promise<Embedding> {
  const { output } = await runEmbeddingTask(rt, {
    task: 'embedItem',
    ctx,
    value: embeddingText(input),
    dimensions: LIMITS.ai.embeddingDimensions,
  });
  return output;
}
