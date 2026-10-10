import { fileURLToPath } from 'node:url';
import { LIMITS } from '@fellow-owners/shared';
import { isAiUnavailable } from '../../ai/types.js';
import { buildContainer, type CoreDeps } from '../../container.js';
import { closeDb } from '../client.js';

/**
 * pnpm db:embed — fills in the embeddings the seed does not carry (05-backend-schema section 9).
 *
 * About 1,500 vectors of 1,536 floats would bloat the repo, so data/*.json has no embeddings and
 * seeded posts start with a null vector. P0 works without them (people search uses skills and text
 * search); the P1 features that need them — similar ideas, people who could help, Ask your AI —
 * call this once an OPENROUTER_API_KEY is set.
 *
 * Safe to stop and rerun: it only ever reads rows whose embedding is still null, so a second run
 * picks up where the first stopped. With no key the fake AI returns deterministic vectors, which
 * are useless for real similarity but keep the column non-null for local work.
 *
 * ponytail: posts only. They are the only table with the backfill queries (posts.repo.ts
 * listMissingEmbeddings / setEmbedding); pitches and memberships also have a vector column, and
 * when a P1 feature actually searches them, add the same two queries there and a pass here.
 */

/** Posts embedded per round trip to the model. */
const BATCH_SIZE = 20;

export interface EmbedResult {
  embedded: number;
  /** Posts whose embedding call failed and are still null. */
  failed: number;
  /** Set when the AI stopped the run early (budget used up, or AI turned off). */
  stoppedBecause?: string;
}

export async function embedMissing(
  deps: CoreDeps,
  options: { batchSize?: number; max?: number } = {},
): Promise<EmbedResult> {
  const { repos, ai, logger } = deps;
  const batchSize = options.batchSize ?? BATCH_SIZE;
  const max = options.max ?? Number.POSITIVE_INFINITY;
  let embedded = 0;
  let failed = 0;

  for (;;) {
    if (embedded + failed >= max) break;
    const batch = await repos.posts.listMissingEmbeddings(batchSize);
    if (batch.length === 0) break;

    const results = await Promise.allSettled(
      batch.map(async (post) => {
        const vector = await ai.embedItem(
          { title: post.title, body: post.body },
          { spaceId: post.spaceId, refType: 'post', refId: post.id },
        );
        if (vector.length !== LIMITS.ai.embeddingDimensions) {
          throw new Error(
            `expected ${LIMITS.ai.embeddingDimensions} dimensions, got ${vector.length}`,
          );
        }
        await repos.posts.setEmbedding(post.id, vector);
      }),
    );

    let batchFailures = 0;
    for (const result of results) {
      if (result.status === 'fulfilled') {
        embedded += 1;
        continue;
      }
      failed += 1;
      batchFailures += 1;
      // Budget used up or AI off: every later call would fail the same way. Stop, do not spin.
      if (isAiUnavailable(result.reason) && result.reason.reason !== 'provider') {
        logger.warn({ reason: result.reason.reason, embedded }, 'embed backfill stopped');
        return { embedded, failed, stoppedBecause: result.reason.reason };
      }
      logger.warn({ err: result.reason }, 'embedding failed for one post');
    }

    // Every post in the batch failed on the provider: the next batch would be the same rows again
    // (they are still null), so stop rather than loop forever.
    if (batchFailures === batch.length) {
      return { embedded, failed, stoppedBecause: 'provider' };
    }
    logger.info({ embedded, failed }, 'embed backfill progress');
  }

  return { embedded, failed };
}

async function main(): Promise<void> {
  const started = Date.now();
  const container = buildContainer();
  try {
    if (container.ai.mode === 'fake') {
      console.warn('[embed] no OPENROUTER_API_KEY: writing deterministic fake vectors');
    }
    const { embedded, failed, stoppedBecause } = await embedMissing(container);
    console.info(`[embed] ${embedded} embedded, ${failed} failed in ${Date.now() - started} ms`);
    if (stoppedBecause) {
      console.warn(`[embed] stopped early: ${stoppedBecause}`);
      process.exitCode = 1;
    }
  } catch (error) {
    console.error('[embed] failed:', error);
    process.exitCode = 1;
  } finally {
    await closeDb();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await main();
}
