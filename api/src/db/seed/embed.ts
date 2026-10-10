import { fileURLToPath } from 'node:url';
import { LIMITS } from '@fellow-owners/shared';
import { and, asc, eq, isNull, ne, sql } from 'drizzle-orm';
import { isAiUnavailable } from '../../ai/types.js';
import { buildContainer, type CoreDeps } from '../../container.js';
import { closeDb } from '../client.js';
import { inbound } from '../schema/inbound.js';
import { memberships } from '../schema/memberships.js';

/**
 * pnpm db:embed — fills in the embeddings the seed does not carry (05-backend-schema section 9).
 *
 * About 1,500 vectors of 1,536 floats would bloat the repo, so data/*.json has no embeddings and
 * seeded posts start with a null vector. P0 works without them (people search uses skills and text
 * search); the P1 features that need them — similar ideas, people who could help, Ask your AI —
 * call this once an OPENROUTER_API_KEY is set. It fills posts, pitches and members (headline, intro and
 * skills).
 *
 * Safe to stop and rerun: it only ever reads rows whose embedding is still null, so a second run
 * picks up where the first stopped. With no key the fake AI returns deterministic vectors, which
 * are useless for real similarity but keep the column non-null for local work.
 *
 */

/** Rows embedded per round trip to the model. */
const BATCH_SIZE = 20;

export interface EmbedResult {
  embedded: number;
  /** Rows whose embedding call failed and are still null. */
  failed: number;
  /** Set when the AI stopped the run early (budget used up, or AI turned off). */
  stoppedBecause?: string;
}

/** One table to backfill: the next rows without a vector, and where the vector is saved. */
interface Source {
  refType: string;
  next(limit: number): Promise<Array<{ id: string; spaceId: string; title: string; body: string }>>;
  save(id: string, vector: number[]): Promise<void>;
}

function sources({ db, repos }: CoreDeps): Source[] {
  return [
    {
      refType: 'post',
      next: (limit) => repos.posts.listMissingEmbeddings(limit),
      save: (id, vector) => repos.posts.setEmbedding(id, vector),
    },
    {
      refType: 'inbound',
      next: (limit) =>
        db
          .select({
            id: inbound.id,
            spaceId: inbound.spaceId,
            title: inbound.subject,
            body: inbound.body,
          })
          .from(inbound)
          .where(and(isNull(inbound.embedding), ne(inbound.status, 'withdrawn')))
          .orderBy(asc(inbound.createdAt))
          .limit(limit),
      save: async (id, vector) => {
        await db.update(inbound).set({ embedding: vector }).where(eq(inbound.id, id));
      },
    },
    {
      // Members with something to say; the owner never shows up as a helper.
      refType: 'membership',
      next: (limit) =>
        db
          .select({
            id: memberships.id,
            spaceId: memberships.spaceId,
            title: sql<string>`coalesce(${memberships.headline}, '')`,
            body: sql<string>`concat_ws(chr(10), ${memberships.intro}, array_to_string(${memberships.skills}, ', '))`,
          })
          .from(memberships)
          .where(
            and(
              isNull(memberships.embedding),
              isNull(memberships.removedAt),
              ne(memberships.role, 'owner'),
              sql`(${memberships.headline} is not null or ${memberships.intro} is not null or cardinality(${memberships.skills}) > 0)`,
            ),
          )
          .orderBy(asc(memberships.joinedAt))
          .limit(limit),
      save: async (id, vector) => {
        await db.update(memberships).set({ embedding: vector }).where(eq(memberships.id, id));
      },
    },
  ];
}

export async function embedMissing(
  deps: CoreDeps,
  options: { batchSize?: number; max?: number } = {},
): Promise<EmbedResult> {
  const { ai, logger } = deps;
  const batchSize = options.batchSize ?? BATCH_SIZE;
  const max = options.max ?? Number.POSITIVE_INFINITY;
  let embedded = 0;
  let failed = 0;

  for (const source of sources(deps)) {
    for (;;) {
      if (embedded + failed >= max) return { embedded, failed };
      const batch = await source.next(batchSize);
      if (batch.length === 0) break;

      const results = await Promise.allSettled(
        batch.map(async (row) => {
          const vector = await ai.embedItem(
            { title: row.title, body: row.body },
            { spaceId: row.spaceId, refType: source.refType, refId: row.id },
          );
          if (vector.length !== LIMITS.ai.embeddingDimensions) {
            throw new Error(
              `expected ${LIMITS.ai.embeddingDimensions} dimensions, got ${vector.length}`,
            );
          }
          await source.save(row.id, vector);
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
        logger.warn(
          { err: result.reason, refType: source.refType },
          'embedding failed for one row',
        );
      }

      // Every row in the batch failed on the provider: the next batch would be the same rows again
      // (they are still null), so stop rather than loop forever.
      if (batchFailures === batch.length) {
        return { embedded, failed, stoppedBecause: 'provider' };
      }
      logger.info({ embedded, failed }, 'embed backfill progress');
    }
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
