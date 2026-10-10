import type { AskAiRequestInput, AskAnswer } from '@fellow-owners/shared';
import { apiFetch } from '@/lib/fetcher';

// Typed client for Ask your AI (F13), creator only. 429 once the day's questions are used.

/** POST /api/studio/ask */
export function askAi(input: AskAiRequestInput): Promise<AskAnswer> {
  return apiFetch<AskAnswer>('/api/studio/ask', { method: 'POST', json: input });
}
