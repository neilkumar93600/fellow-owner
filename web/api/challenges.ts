import type {
  ChallengeSummary,
  ChallengeWinnerInput,
  CreateChallengeInput,
  IdeaItem,
} from '@fellow-owners/shared';
import { apiFetch } from '@/lib/fetcher';

// Typed client for /api/studio/challenges (creator only). A new file: studio.ts belongs to other tasks.

const at = (segment: string) => encodeURIComponent(segment);

/** GET /challenges : open and closed, newest first. */
export function getChallenges(signal?: AbortSignal): Promise<{ items: ChallengeSummary[] }> {
  return apiFetch<{ items: ChallengeSummary[] }>('/api/studio/challenges', { signal });
}

/** GET /challenges/:id : the challenge and every entry (a post linked to it). */
export function getChallenge(
  id: string,
  signal?: AbortSignal,
): Promise<ChallengeSummary & { entries: IdeaItem[] }> {
  return apiFetch(`/api/studio/challenges/${at(id)}`, { signal });
}

/** POST /challenges : 201, 422 for a due date in the past. */
export function createChallenge(input: CreateChallengeInput): Promise<ChallengeSummary> {
  return apiFetch<ChallengeSummary>('/api/studio/challenges', { method: 'POST', json: input });
}

/** POST /challenges/:id/close : stops entries and builds the shortlist (top 3, with reasons). */
export function closeChallenge(id: string): Promise<ChallengeSummary> {
  return apiFetch<ChallengeSummary>(`/api/studio/challenges/${at(id)}/close`, { method: 'POST' });
}

/** POST /challenges/:id/winner : 422 unless the post is an entry of this challenge. */
export function pickChallengeWinner(
  id: string,
  input: ChallengeWinnerInput,
): Promise<ChallengeSummary> {
  return apiFetch<ChallengeSummary>(`/api/studio/challenges/${at(id)}/winner`, {
    method: 'POST',
    json: input,
  });
}
