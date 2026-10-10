import { notFound } from 'next/navigation';
import { spaceOgImage } from '@/components/bio/og-image';
import { getShowcase } from '@/lib/server-api';

export const alt = 'Something a fan made, featured on Fellow Owners';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// The showcase's share card: the creator's avatar, the project title, "Featured by Mira Lane" and the
// project's community.
export default async function Image({
  params,
}: {
  params: Promise<{ handle: string; slug: string }>;
}) {
  const { handle, slug } = await params;
  const showcase = await getShowcase(handle, slug);
  if (!showcase) notFound();
  const { space, post } = showcase;
  const featuredBy = `Featured by ${space.displayName}`;
  return spaceOgImage({
    title: post?.title ?? featuredBy,
    line: post ? featuredBy : null,
    person: { name: space.displayName, avatarUrl: space.avatarUrl },
    chips: post ? [post.community] : [],
    isDemo: space.isDemo,
  });
}
