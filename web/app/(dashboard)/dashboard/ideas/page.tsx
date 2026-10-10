import type { Metadata } from 'next';
import { IdeasView } from '@/components/dashboard/ideas/ideas-view';

export const metadata: Metadata = { title: 'Ideas' };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // The view reads the query itself (useSearchParams). Keying on ?q= starts it fresh when a server
  // navigation brings a new search, such as the header's "Search ideas".
  const { q } = await searchParams;
  return <IdeasView key={typeof q === 'string' ? q : ''} />;
}
