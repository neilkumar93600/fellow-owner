import { useQuery } from '@tanstack/react-query';
import { getPublicConfig } from '@/lib/api/config';

export const publicConfigKeys = { all: ['public-config'] as const };

/** What this deployment offers (sign-in providers, demo, uploads). The API caches it for 5 minutes. */
export function usePublicConfig() {
  return useQuery({
    queryKey: publicConfigKeys.all,
    queryFn: ({ signal }) => getPublicConfig(signal),
    staleTime: 5 * 60_000,
  });
}
