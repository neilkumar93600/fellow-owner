import type { CoachRequestInput } from '@fellow-owners/shared';
import { useMutation } from '@tanstack/react-query';
import { checkWithCoach } from '@/api/coach';

/**
 * Idea Coach (F30): clarity checks on a pitch or post draft. A mutation, not a query: each press of
 * "Check" is one counted call. 429 once the day's checks are used; 503 when the AI is unavailable.
 */
export function useCoachCheck(handle: string) {
  return useMutation({ mutationFn: (input: CoachRequestInput) => checkWithCoach(handle, input) });
}
