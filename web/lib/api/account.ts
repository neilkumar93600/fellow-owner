import type { AccountExport } from '@fellow-owners/shared';
import { apiFetch } from '@/lib/fetcher';

// Typed client for /api/me (the signed-in person's own data). Password, sessions and account
// deletion go through the Better Auth client in lib/auth-client.ts.

/** GET /api/me/export : only the caller's own rows. */
export function exportAccount(signal?: AbortSignal): Promise<AccountExport> {
  return apiFetch<AccountExport>('/api/me/export', { signal });
}
