import { notFound } from 'next/navigation';
import { spaceOgImage } from '@/components/bio/og-image';
import { getSpacePage } from '@/lib/server-api';

export const alt = 'A creator’s space on Fellow Owners';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// The bio link's share card: the creator's avatar, name, bio and their first three communities.
export default async function Image({ params }: { params: Promise<{ handle: string }> }) {
  const page = await getSpacePage((await params).handle);
  if (!page) notFound();
  const { space, communities } = page;
  return spaceOgImage({
    title: space.displayName,
    line: space.bio,
    person: { name: space.displayName, avatarUrl: space.avatarUrl },
    chips: communities,
    isDemo: space.isDemo,
  });
}
