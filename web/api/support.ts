import type { SupportRequestInput } from '@fellow-owners/shared';
import { apiFetch } from '@/lib/fetcher';

/** POST /api/support/requests : always 202 `{ received: true }`; 429 after 5 an hour. */
export function submitSupportRequest(input: SupportRequestInput): Promise<{ received: true }> {
  return apiFetch<{ received: true }>('/api/support/requests', { method: 'POST', json: input });
}
