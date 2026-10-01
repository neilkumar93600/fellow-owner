import type { PitchType, PostType } from '@fellow-owners/shared';
import { isPitchType, isPostType } from '../ai/fake.js';
import {
  type AiServices,
  type Analyzer,
  type BackgroundRunner,
  type Embedding,
  type ItemRef,
  isAiUnavailable,
  type SweepResult,
} from '../ai/types.js';
import type { Logger } from '../lib/logger.js';
import type { Repos } from '../repositories/index.js';
import type { AnalysisSubject } from '../repositories/posts.repo.js';
import { sweepSpace } from './sweep.js';

export interface AnalyzerDeps {
  repos: Pick<Repos, 'posts' | 'pitches'>;
  ai: AiServices;
  background: BackgroundRunner;
  logger: Logger;
}

export interface AnalyzeOptions {
  /** The caller already holds the item's lease (sweep). Otherwise analyze claims it. */
  claimed?: boolean;
}

/**
 * What happened to one item:
 * - `done`:      triage (and embedding when missing) saved, status `done`
 * - `skipped`:   already analyzed for this content and taste version, deleted, or `failed`
 * - `busy`:      another worker holds the item's lease
 * - `missing`:   the item no longer exists
 * - `postponed`: AI disabled or today's budget used up; the item stays pending, no attempt used
 * - `failed`:    the AI failed; attempts + 1 (`failed` after 3, see posts.markFailed)
 * - `stale`:     the content changed while the AI ran; the result was dropped
 */
export type AnalyzeOutcome =
  | 'done'
  | 'skipped'
  | 'busy'
  | 'missing'
  | 'postponed'
  | 'failed'
  | 'stale';

function categoryFor(subject: AnalysisSubject, category: string): PostType | PitchType {
  if (subject.kind === 'post') return isPostType(category) ? category : (subject.type as PostType);
  return isPitchType(category) ? category : (subject.type as PitchType);
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message || error.name;
  return String(error);
}

/** Done for the current content and taste version: nothing to do (02-trd: once per item). */
function isUpToDate(subject: AnalysisSubject): boolean {
  return subject.analysisStatus === 'done' && subject.scoredTasteVersion === subject.tasteVersion;
}

/**
 * Item analysis (02-trd data flow 1): triage on the fast model and the embedding in parallel,
 * then saveAnalysis (`done`) or markFailed (attempts + 1, `failed` after 3).
 * - Content edits reset the item to pending (services), so `done` plus the current taste
 *   version means the stored result matches the current content hash.
 * - The result is dropped if the content changed while the AI was running (content hash guard).
 * - An embedding failure does not fail the item (pnpm db:embed backfills missing vectors).
 * - AI disabled or budget reached leaves the item pending without using an attempt; the next
 *   sweep picks it up ("AI paused until tomorrow").
 */
export function createAnalyzer(deps: AnalyzerDeps): Analyzer & {
  analyze(ref: ItemRef, options?: AnalyzeOptions): Promise<AnalyzeOutcome>;
} {
  const log = deps.logger.child({ module: 'analyzer' });

  async function analyze(
    ref: ItemRef,
    { claimed = false }: AnalyzeOptions = {},
  ): Promise<AnalyzeOutcome> {
    const repo = ref.kind === 'post' ? deps.repos.posts : deps.repos.pitches;
    if (!claimed && !(await repo.claimItem(ref.id))) {
      log.debug({ ref }, 'item is being analyzed elsewhere');
      return 'busy';
    }
    const subject = await repo.getForAnalysis(ref.id);
    if (!subject) return 'missing';
    if (subject.deleted || subject.analysisStatus === 'failed' || isUpToDate(subject)) {
      await repo.releaseClaim(subject.id);
      return 'skipped';
    }

    const ctx = {
      spaceId: subject.spaceId,
      userId: null,
      refType: subject.kind,
      refId: subject.id,
    };
    const started = Date.now();
    try {
      const embeddingTask: Promise<Embedding | undefined> = subject.hasEmbedding
        ? Promise.resolve(undefined)
        : deps.ai.embedItem({ title: subject.title, body: subject.body }, ctx).catch((error) => {
            log.warn({ err: error, ref }, 'embedding failed; saving triage without it');
            return undefined;
          });
      const [triage, embedding] = await Promise.all([
        deps.ai.triageItem(
          {
            kind: subject.kind,
            type: subject.type,
            title: subject.title,
            body: subject.body,
            links: subject.links,
            communityName: subject.communityName,
            tasteProfile: subject.tasteProfile,
            creatorName: subject.creatorName,
          },
          ctx,
        ),
        embeddingTask,
      ]);
      const saved = await repo.saveAnalysis(
        subject.id,
        {
          summary: triage.summary,
          category: categoryFor(subject, triage.category),
          fitScore: triage.fitScore,
          fitReason: triage.fitReason,
          tags: triage.tags,
          skills: triage.skills,
          isSpam: triage.isSpam,
          scoredTasteVersion: subject.tasteVersion,
          ...(embedding ? { embedding } : {}),
        },
        { expectedContentHash: subject.contentHash },
      );
      if (!saved) {
        // The edit that changed the content also reset the item (pending, lease cleared) and
        // queued a new analysis; releasing here could free that newer worker's lease.
        log.info({ ref }, 'content changed during analysis; result dropped');
        return 'stale';
      }
      log.debug(
        { ref, ms: Date.now() - started, fit: triage.fitScore, spam: triage.isSpam },
        'item analyzed',
      );
      return 'done';
    } catch (error) {
      if (isAiUnavailable(error) && error.reason !== 'provider') {
        log.info({ ref, reason: error.reason }, 'analysis postponed');
        await repo.releaseClaim(subject.id);
        return 'postponed';
      }
      const result = await repo.markFailed(subject.id, errorMessage(error));
      log.warn(
        { err: error, ref, attempts: result?.attempts, status: result?.status },
        'analysis failed',
      );
      return 'failed';
    }
  }

  /** Never throws: database errors are logged and the lease expires on its own. */
  async function analyzeSafely(ref: ItemRef, options?: AnalyzeOptions): Promise<AnalyzeOutcome> {
    try {
      return await analyze(ref, options);
    } catch (error) {
      log.error({ err: error, ref }, 'analysis crashed');
      return 'failed';
    }
  }

  return {
    analyze: analyzeSafely,
    analyzeItem: async (ref) => {
      await analyzeSafely(ref);
    },
    sweep: (spaceId): Promise<SweepResult> =>
      sweepSpace({ repos: deps.repos, background: deps.background, logger: log }, spaceId, (ref) =>
        analyzeSafely(ref, { claimed: true }),
      ),
  };
}
