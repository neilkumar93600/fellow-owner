import type { DemoSessionInput, DemoSessionResponse } from '@fellow-owners/shared';
import { apiFetch } from '@/lib/fetcher';

/** POST /api/demo/session: signs into the seeded demo creator or fan and sets the session cookie. */
export function enterDemo(as: DemoSessionInput['as']): Promise<DemoSessionResponse> {
  return apiFetch<DemoSessionResponse>('/api/demo/session', { method: 'POST', json: { as } });
}
