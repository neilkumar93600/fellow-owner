import { LIMITS } from '@fellow-owners/shared';
import { TransactionRollbackError } from 'drizzle-orm';
import { isAiUnavailable } from '../ai/types.js';
import type { CoreDeps } from '../container.js';
import type { SpaceRow } from '../db/schema/spaces.js';
import { daysAgo, hoursAgo } from '../lib/dates.js';
import type { GroupCandidateRow } from '../repositories/question-groups.repo.js';
import { namingInput } from '../services/question-groups.service.js';

export type QuestionGrouperDeps = Pick<CoreDeps, 'db' | 'repos' | 'ai' | 'logger'>;

export interface GroupSpaceResult {
  /** New groups seeded this run. */
  created: number;
  /** Pitches that joined an existing group. */
  joined: number;
}

const A = LIMITS.answerOnce;
/** C6: pitches missing an embedding are embedded first, at most this many per run. */
const EMBED_PER_RUN = 50;
/**
 * A space is due when a groupable pitch arrived within this window. Two hours, so one missed
 * hourly tick still catches up.
 */
const DUE_WINDOW_HOURS = 2;

// ---------------------------------------------------------------- clustering (pure)

/** Cosine distance (0 = same direction, 1 = orthogonal, 2 = opposite), as pgvector's `<=>`. */
export function cosineDistance(a: readonly number[], b: readonly number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i += 1) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  if (na === 0 || nb === 0) return 1;
  return 1 - dot / Math.sqrt(na * nb);
}

export interface ClusterItem {
  id: string;
  vector: number[];
}

export interface ClusterGroup {
  id: string;
  centroid: number[];
  size: number;
}

export interface ClusterResult {
  /** Existing group id -> candidate ids that join it. */
  joins: Map<string, string[]>;
  /** New clusters (any size; the caller creates those with >= minGroupSize). */
  clusters: Array<{ ids: string[]; centroid: number[] }>;
}

/**
 * Greedy single pass in the given order: each candidate joins the nearest group or new cluster
 * whose centroid is within `maxDistance` (centroids move as members join), else seeds a new
 * cluster. ponytail: O(candidates x groups); fine for a 30-day window of one space's pitches.
 */
export function clusterCandidates(
  candidates: readonly ClusterItem[],
  openGroups: readonly ClusterGroup[],
  maxDistance: number,
): ClusterResult {
  interface Bucket {
    groupId: string | null;
    ids: string[];
    centroid: number[];
    size: number;
  }
  const buckets: Bucket[] = openGroups.map((group) => ({
    groupId: group.id,
    ids: [],
    centroid: [...group.centroid],
    size: group.size,
  }));
  for (const item of candidates) {
    let best: Bucket | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const bucket of buckets) {
      const distance = cosineDistance(item.vector, bucket.centroid);
      if (distance <= maxDistance && distance < bestDistance) {
        best = bucket;
        bestDistance = distance;
      }
    }
    if (!best) {
      buckets.push({ groupId: null, ids: [item.id], centroid: [...item.vector], size: 1 });
      continue;
    }
    const n = best.size;
    best.centroid = best.centroid.map((value, i) => (value * n + (item.vector[i] ?? 0)) / (n + 1));
    best.size = n + 1;
    best.ids.push(item.id);
  }
  const joins = new Map<string, string[]>();
  const clusters: ClusterResult['clusters'] = [];
  for (const bucket of buckets) {
    if (bucket.ids.length === 0) continue;
    if (bucket.groupId) joins.set(bucket.groupId, bucket.ids);
    else clusters.push({ ids: bucket.ids, centroid: bucket.centroid });
  }
  return { joins, clusters };
}

// ---------------------------------------------------------------- the job

/**
 * F32 Answer Once grouping job (tick `group_questions`, spec 4.4). Candidates: groupable pitches
 * (fan notes, ideas, other) of the last 30 days, not spam, still new or shortlisted, ungrouped
 * and never removed by the creator. Each joins the nearest open group within
 * LIMITS.answerOnce.maxDistance, else clusters with the others; a new cluster of 3+ is named by
 * the `questionGroup` AI task. The AI saying "not one question" leaves the pitches ungrouped (they
 * stay eligible); the AI failing creates the group with the first subject as a placeholder
 * question and no draft, and a later run names it.
 */
export function createQuestionGrouper(deps: QuestionGrouperDeps) {
  const { db, repos, ai } = deps;
  const log = deps.logger.child({ module: 'group-questions' });

  /** Embeds candidates without an embedding (C6). Stops at the first AI unavailable. */
  async function embedMissing(spaceId: string, candidates: GroupCandidateRow[]): Promise<void> {
    for (const candidate of candidates.filter((c) => !c.embedding).slice(0, EMBED_PER_RUN)) {
      try {
        const vector = await ai.embedItem(
          { title: candidate.subject, body: candidate.body },
          { spaceId, userId: null, refType: 'inbound', refId: candidate.id },
        );
        await repos.questionGroups.setPitchEmbedding(candidate.id, vector);
        candidate.embedding = vector;
      } catch (error) {
        if (isAiUnavailable(error)) return;
        log.warn({ err: error, pitchId: candidate.id }, 'pitch embedding failed');
      }
    }
  }

  /** The AI's question + draft; null on "not one question"; 'failed' when the AI is unavailable. */
  async function name(space: SpaceRow, bodies: string[], refId?: string) {
    try {
      const output = await ai.questionGroup(namingInput(space, bodies), {
        spaceId: space.id,
        userId: null,
        refType: 'question_group',
        ...(refId ? { refId } : {}),
      });
      return output.isQuestion && output.question && output.draft ? output : null;
    } catch (error) {
      if (!isAiUnavailable(error)) log.warn({ err: error, spaceId: space.id }, 'naming failed');
      return 'failed' as const;
    }
  }

  /** Retries the AI for open groups still waiting for their question and draft. */
  async function nameWaiting(space: SpaceRow): Promise<void> {
    for (const group of await repos.questionGroups.needsNaming(space.id)) {
      const members = await repos.questionGroups.members([group.id]);
      const output = await name(
        space,
        members.map((member) => member.body),
        group.id,
      );
      if (output === 'failed') return;
      if (output === null) {
        // Not one question after all: the pitches go back to the pool (FK on delete set null).
        await repos.questionGroups.deleteById(group.id);
        continue;
      }
      await repos.questionGroups.setNaming(group.id, {
        question: output.question,
        draft: output.draft,
      });
    }
  }

  async function groupSpace(spaceId: string): Promise<GroupSpaceResult> {
    const result: GroupSpaceResult = { created: 0, joined: 0 };
    const space = await repos.questionGroups.space(spaceId);
    if (!space) return result;
    await nameWaiting(space);

    const since = daysAgo(A.windowDays);
    const candidates = await repos.questionGroups.candidates(spaceId, since);
    await embedMissing(spaceId, candidates);
    const byId = new Map(candidates.map((candidate) => [candidate.id, candidate]));
    const items = candidates.flatMap((candidate) =>
      candidate.embedding ? [{ id: candidate.id, vector: candidate.embedding }] : [],
    );
    if (items.length === 0) return result;

    const open = await repos.questionGroups.openCentroids(spaceId);
    const { joins, clusters } = clusterCandidates(items, open, A.maxDistance);

    for (const [groupId, ids] of joins) {
      result.joined += await db.transaction(async (tx) => {
        const moved = await repos.questionGroups.assign(spaceId, groupId, ids, since, tx);
        if (moved > 0) await repos.questionGroups.refreshStats(groupId, tx);
        return moved;
      });
    }

    for (const cluster of clusters) {
      if (cluster.ids.length < A.minGroupSize) continue;
      const members = cluster.ids.flatMap((id) => byId.get(id) ?? []);
      const output = await name(
        space,
        members.map((member) => member.body),
      );
      if (output === null) continue;
      const first = members[0];
      if (!first) continue;
      const created = await db
        .transaction(async (tx) => {
          const group = await repos.questionGroups.insert(
            {
              spaceId,
              question: output === 'failed' ? first.subject : output.question,
              draft: output === 'failed' ? null : output.draft,
              embedding: cluster.centroid,
              askedCount: 0,
              firstAskedAt: first.createdAt,
              lastAskedAt: first.createdAt,
            },
            tx,
          );
          const moved = await repos.questionGroups.assign(
            spaceId,
            group.id,
            cluster.ids,
            since,
            tx,
          );
          // Someone changed these pitches meanwhile (withdrawn, replied): drop the half group.
          if (moved < A.minGroupSize) tx.rollback();
          await repos.questionGroups.refreshStats(group.id, tx);
          return true;
        })
        .catch((error: unknown) => {
          if (error instanceof TransactionRollbackError) return false;
          throw error;
        });
      if (created) result.created += 1;
    }
    if (result.created || result.joined) log.info({ spaceId, ...result }, 'questions grouped');
    return result;
  }

  return {
    groupSpace,

    /** Spaces with new groupable pitches in the last 2 hours, or groups missing their draft. */
    async groupDueSpaces(now: Date): Promise<number> {
      const spaceIds = await repos.questionGroups.dueSpaceIds(hoursAgo(DUE_WINDOW_HOURS, now));
      let done = 0;
      for (const spaceId of spaceIds) {
        try {
          await groupSpace(spaceId);
          done += 1;
        } catch (error) {
          log.error({ err: error, spaceId }, 'grouping failed');
        }
      }
      return done;
    },
  };
}

export type QuestionGrouper = ReturnType<typeof createQuestionGrouper>;
