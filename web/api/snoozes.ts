import type { ChecklistStepInput, SnoozeInput, SnoozeRefType } from '@fellow-owners/shared';
import { apiFetch } from '@/lib/fetcher';

// Typed client for snoozes on Today and the setup checklist (creator only).

const at = (segment: string) => encodeURIComponent(segment);

/** POST /api/studio/snoozes : hide a pitch or post from the Today cards for `days` (default 1). */
export async function snooze(input: SnoozeInput): Promise<void> {
  await apiFetch('/api/studio/snoozes', { method: 'POST', json: input });
}

/** DELETE /api/studio/snoozes/:refType/:refId */
export async function unsnooze(refType: SnoozeRefType, refId: string): Promise<void> {
  await apiFetch(`/api/studio/snoozes/${at(refType)}/${at(refId)}`, { method: 'DELETE' });
}

/** POST /api/studio/checklist : records a setup step the API cannot see (the bio link was shared). */
export async function markChecklistStep(input: ChecklistStepInput): Promise<void> {
  await apiFetch('/api/studio/checklist', { method: 'POST', json: input });
}
