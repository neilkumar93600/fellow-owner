import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { MediaKitScreen } from '@/components/media-kit/media-kit-screen';
import { routes } from '@/lib/routes';
import { pageMetadata } from '@/lib/seo';
import { getSpacePage } from '@/lib/server-api';

// Wave A stub: reads the bio page for the name and stays out of search results. B4 switches it to
// getMediaKit (lib/server-api.ts), which is null (404) while the creator has the media kit off,
// and makes it indexable.

type Props = { params: Promise<{ handle: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = await getSpacePage((await params).handle);
  if (!page) return {};
  const { displayName, handle } = page.space;
  return pageMetadata({
    title: `${displayName} media kit`,
    description: `Reach, engagement and rates for brands working with ${displayName} (@${handle}).`,
    path: routes.fan.mediaKit(handle),
    noindex: true,
  });
}

export default async function Page({ params }: Props) {
  const page = await getSpacePage((await params).handle);
  if (!page) notFound();
  return <MediaKitScreen space={page.space} />;
}
