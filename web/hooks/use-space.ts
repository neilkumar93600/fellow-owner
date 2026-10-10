import type { StudioSpace } from '@fellow-owners/shared';
import { useQuery } from '@tanstack/react-query';
import { getMySpace } from '@/api/studio';

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

/** "Mira" for the welcome line: the account name's first word, else the space's display name. */
export function creatorFirstName(space: Pick<StudioSpace, 'ownerName' | 'displayName'>): string {
  // ponytail: the API sends "Member" for an account without a name (api/src/lib/present.ts).
  const owner = space.ownerName.trim();
  const name = owner && owner !== 'Member' ? owner : space.displayName.trim();
  return name.split(/\s+/)[0] ?? name;
}
