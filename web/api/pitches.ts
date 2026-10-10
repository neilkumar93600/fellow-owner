import type { Pitch, WithdrawPitchInput } from '@fellow-owners/shared';
import { apiFetch } from '@/lib/fetcher';

/** PATCH /api/pitches/:id: the sender withdraws a pitch while it is `new` (409 after). */
export function withdrawPitch(id: string): Promise<Pitch> {
  return apiFetch<Pitch>(`/api/pitches/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    json: { status: 'withdrawn' } satisfies WithdrawPitchInput,
  });
}
