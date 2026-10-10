import type { CoachRequestInput, CoachResult } from '@fellow-owners/shared';
import { apiFetch } from '@/lib/fetcher';

// Typed client for the Idea Coach (F30). Needs a session; 429 once the day's checks are used.

/** POST /api/spaces/:handle/coach : clarity checks for a pitch or post draft. */
export function checkWithCoach(handle: string, input: CoachRequestInput): Promise<CoachResult> {
  return apiFetch<CoachResult>(`/api/spaces/${encodeURIComponent(handle)}/coach`, {
    method: 'POST',
    json: input,
  });
}
