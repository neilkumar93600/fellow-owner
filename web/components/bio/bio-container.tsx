'use client';

import type { SpacePage } from '@fellow-owners/shared';
import { useSpacePage } from '@/hooks/queries/use-space-page';
import { useMembership } from '@/hooks/use-membership';
import { BioView } from './bio-view';

/**
 * The bio link's data: the server-rendered page as initial data (so it paints without a fetch and
 * refreshes after a join), plus who the viewer is. While the membership loads, or if it fails, the
 * viewer is treated as a visitor: Join shows, which is also what the API would do for them.
 */
export function BioContainer({ initialPage }: { initialPage: SpacePage }) {
  const { data: page } = useSpacePage(initialPage.space.handle, initialPage);
  const { data: viewer } = useMembership(initialPage.space.handle);
  return (
    <BioView
      page={page ?? initialPage}
      joinedIds={viewer?.membership?.communityIds}
      isOwner={viewer?.isOwner}
    />
  );
}
