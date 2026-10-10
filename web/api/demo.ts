import type { DemoSessionInput, DemoSessionResponse } from '@fellow-owners/shared';
import { apiFetch } from '@/lib/fetcher';
import { getQueryClient } from '@/lib/query-client';

/**
 * POST /api/demo/session: signs into the seeded demo creator or fan and sets the session cookie.
 * Whatever the browser cached for the previous visitor (another demo role, a real account) is dropped.
 */
export async function enterDemo(as: DemoSessionInput['as']): Promise<DemoSessionResponse> {
  const session = await apiFetch<DemoSessionResponse>('/api/demo/session', {
    method: 'POST',
    json: { as },
  });
  getQueryClient().clear();
  return session;
}
