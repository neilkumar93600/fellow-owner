import type { Metadata } from 'next';
import { CommunityDetailView } from '@/components/dashboard/communities/community-detail-view';

type Params = Promise<{ slug: string }>;

export const metadata: Metadata = { title: 'Community' };

export default async function Page({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ slug }, { tab }] = await Promise.all([params, searchParams]);
  return <CommunityDetailView slug={slug} tab={tab === 'posts' ? 'posts' : 'members'} />;
}
