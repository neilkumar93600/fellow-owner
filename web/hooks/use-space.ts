import type { StudioSpace } from '@fellow-owners/shared';
import { type QueryClient, useQuery } from '@tanstack/react-query';
import { getMySpace } from '@/lib/api/studio';

// No 'use client' here: server code may import the keys and creatorFirstName; the hooks only
// run inside client components.

/** Every studio query key starts with 'studio', so one invalidation can refresh the dashboard. */
export const studioKeys = {
  all: ['studio'] as const,
  space: ['studio', 'space'] as const,
};

/** The creator's own space. Pass the server-fetched space as `initialData` to skip a loading state. */
export function useStudioSpace(initialData?: StudioSpace) {
  return useQuery({
    queryKey: studioKeys.space,
    queryFn: ({ signal }) => getMySpace(signal),
    initialData,
  });
}

/**
 * The creator's handle for /api/spaces/:handle/... calls (the creator suite). On dashboard pages the
 * shell has already cached the space, so this is set from the first render; undefined elsewhere.
 */
export function useStudioHandle(): string | undefined {
  return useStudioSpace().data?.handle;
}

/** The handle inside a mutation: the cached space, fetched once if it is not cached yet. */
export async function ensureStudioHandle(queryClient: QueryClient): Promise<string> {
  const space = await queryClient.ensureQueryData({
    queryKey: studioKeys.space,
    queryFn: ({ signal }) => getMySpace(signal),
  });
  return space.handle;
}

/** "Mira" for the welcome line: the account name's first word, else the space's display name. */
export function creatorFirstName(space: Pick<StudioSpace, 'ownerName' | 'displayName'>): string {
  // ponytail: the API sends "Member" for an account without a name (api/src/lib/present.ts).
  const owner = space.ownerName.trim();
  const name = owner && owner !== 'Member' ? owner : space.displayName.trim();
  return name.split(/\s+/)[0] ?? name;
}
