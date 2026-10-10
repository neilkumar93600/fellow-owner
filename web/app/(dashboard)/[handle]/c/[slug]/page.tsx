import { POST_TYPES } from '@fellow-owners/shared';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CommunityFeedContainer } from '@/components/community/feed-container';
import { getFreshSpacePage } from '@/lib/server-api';

type Props = {
  params: Promise<{ handle: string; slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

// Read fresh (a community may have just been created); cache() shares it with the layout's read.
async function findCommunity(handle: string, slug: string) {
  const page = await getFreshSpacePage(handle);
  return page?.communities.find((community) => community.slug === slug);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle, slug } = await params;
  return { title: (await findCommunity(handle, slug))?.name ?? 'Community' };
}

export default async function CommunityFeedPage({ params, searchParams }: Props) {
  const [{ handle, slug }, query] = await Promise.all([params, searchParams]);
  const community = await findCommunity(handle, slug);
  if (!community) notFound();

  const type = POST_TYPES.find((value) => value === query.type) ?? 'idea';
  return <CommunityFeedContainer handle={handle} community={community} type={type} />;
}
