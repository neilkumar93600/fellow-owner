import { type AnalysisStatus, RANKING } from '@fellow-owners/shared';

/**
 * Deterministic ranking from 02-trd ("Ranking"). The model scores single items; code orders lists.
 * Every function is pure and takes `now` explicitly where time matters, so tests can pin it.
 */

const HOUR_MS = 3_600_000;

/** AI fit as 0..1: `ai_fit_score / 100`, or 0.5 while the item has no score (pending/failed). */
export function fitComponent(
  aiFitScore: number | null | undefined,
  analysisStatus?: AnalysisStatus | null,
): number {
  if (aiFitScore === null || aiFitScore === undefined) return RANKING.idea.pendingFit;
  if (analysisStatus !== undefined && analysisStatus !== null && analysisStatus !== 'done') {
    return RANKING.idea.pendingFit;
  }
  return clamp01(aiFitScore / 100);
}

export interface SignalCounts {
  useCount: number;
  buildCount: number;
  commentCount: number;
}

/** `min(1, log1p(use + 2 * build + 0.5 * comments) / log1p(50))` */
export function signalScore({ useCount, buildCount, commentCount }: SignalCounts): number {
  const raw = Math.max(0, useCount) + 2 * Math.max(0, buildCount) + 0.5 * Math.max(0, commentCount);
  return Math.min(1, Math.log1p(raw) / Math.log1p(RANKING.idea.signalSaturation));
}

/** `0.5 ^ (age_hours / 72)`; future timestamps count as age 0. */
export function recency(createdAt: Date, now: Date = new Date()): number {
  const ageHours = Math.max(0, (now.getTime() - createdAt.getTime()) / HOUR_MS);
  return 0.5 ** (ageHours / RANKING.idea.recencyHalfLifeHours);
}

export interface IdeaScoreInput extends SignalCounts {
  aiFitScore: number | null;
  analysisStatus: AnalysisStatus;
  createdAt: Date;
}

/** Idea score = 0.5 * fit + 0.3 * signal + 0.2 * recency, in 0..1. */
export function ideaScore(input: IdeaScoreInput, now: Date = new Date()): number {
  const { fitWeight, signalWeight, recencyWeight } = RANKING.idea;
  return (
    fitWeight * fitComponent(input.aiFitScore, input.analysisStatus) +
    signalWeight * signalScore(input) +
    recencyWeight * recency(input.createdAt, now)
  );
}

/** Sorts by idea score desc, then newest, then id (stable and deterministic). */
export function rankIdeas<T extends IdeaScoreInput & { id: string }>(
  items: T[],
  now: Date = new Date(),
): Array<T & { score: number }> {
  return items
    .map((item) => ({ ...item, score: ideaScore(item, now) }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.createdAt.getTime() - a.createdAt.getTime() ||
        (a.id < b.id ? 1 : a.id > b.id ? -1 : 0),
    );
}

/** Inbox "Fit" sort value: the AI fit score when analysis is done, else 50. */
export function inboxFitSortValue(
  aiFitScore: number | null | undefined,
  analysisStatus: AnalysisStatus,
): number {
  if (analysisStatus !== 'done' || aiFitScore === null || aiFitScore === undefined) {
    return RANKING.inbox.pendingFitScore;
  }
  return aiFitScore;
}

export interface RisingPostInput {
  aiFitScore: number | null;
  analysisStatus: AnalysisStatus;
  /** use + build signals received on this post. */
  signalsReceived: number;
}

/**
 * Rising people (14-day window): sum over the member's posts of `fit * (1 + log1p(signals))`,
 * plus 0.1 per accepted team join.
 */
export function risingScore(posts: RisingPostInput[], acceptedTeamJoins: number): number {
  const fromPosts = posts.reduce(
    (sum, post) =>
      sum +
      fitComponent(post.aiFitScore, post.analysisStatus) *
        (1 + Math.log1p(Math.max(0, post.signalsReceived))),
    0,
  );
  return fromPosts + RANKING.rising.teamJoinBonus * Math.max(0, acceptedTeamJoins);
}

/** Percentage change vs previous, rounded to 1 decimal; null when previous is 0. */
export function changePct(value: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((value - previous) / previous) * 1000) / 10;
}

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}
