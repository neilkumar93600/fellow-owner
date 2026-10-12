import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { WorkWithMeScreen } from '@/components/work-with-me/work-with-me-screen';
import { routes } from '@/lib/routes';
import { pageMetadata } from '@/lib/seo';
import { getSpacePage } from '@/lib/server-api';

// Wave A stub: stays out of search results until B4 ships the real form (then drop noindex).

type Props = { params: Promise<{ handle: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = await getSpacePage((await params).handle);
  if (!page) return {};
  const { displayName, handle } = page.space;
  return pageMetadata({
    title: `Work with ${displayName}`,
    description: `Brand partnerships with ${displayName} (@${handle}): tell them about your brand, budget and timeline.`,
    path: routes.fan.workWithMe(handle),
    noindex: true,
  });
}

export default async function Page({ params }: Props) {
  const page = await getSpacePage((await params).handle);
  if (!page) notFound();
  return <WorkWithMeScreen space={page.space} />;
}
