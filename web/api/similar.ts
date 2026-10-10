import type { SimilarResult } from '@fellow-owners/shared';
import { apiFetch } from '@/lib/fetcher';

// Typed client for similar ideas and people who could help (F17).

const at = (segment: string) => encodeURIComponent(segment);

/** GET /api/posts/:postId/similar : the member view. */
export function getSimilar(postId: string, signal?: AbortSignal): Promise<SimilarResult> {
  return apiFetch<SimilarResult>(`/api/posts/${at(postId)}/similar`, { signal });
}

/** GET /api/studio/posts/:postId/similar : the owner view. */
export function getStudioSimilar(postId: string, signal?: AbortSignal): Promise<SimilarResult> {
  return apiFetch<SimilarResult>(`/api/studio/posts/${at(postId)}/similar`, { signal });
}
