import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BioContainer } from '@/components/bio/bio-container';
import { routes } from '@/lib/routes';
import { pageMetadata } from '@/lib/seo';
import { getSpacePage } from '@/lib/server-api';

type Props = { params: Promise<{ handle: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = await getSpacePage((await params).handle);
  if (!page) return {};
  const { displayName, handle, bio } = page.space;
  return pageMetadata({
    title: `${displayName} (@${handle})`,
    description: bio ?? undefined,
    path: routes.fan.space(handle),
  });
}

export default async function Page({ params }: Props) {
  const page = await getSpacePage((await params).handle);
  if (!page) notFound();
  return <BioContainer initialPage={page} />;
}
