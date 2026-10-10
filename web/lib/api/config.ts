import type { PublicConfig } from '@fellow-owners/shared';
import { apiFetch } from '@/lib/fetcher';

/** GET /api/config : what this deployment can offer (cached for 5 minutes). */
export function getPublicConfig(signal?: AbortSignal): Promise<PublicConfig> {
  return apiFetch<PublicConfig>('/api/config', { signal });
}
