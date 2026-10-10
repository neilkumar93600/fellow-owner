import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ShowcaseView } from '@/components/showcase/showcase-view';
import { appUrl } from '@/lib/env';
import { routes } from '@/lib/routes';
import { pageMetadata } from '@/lib/seo';
import { getShowcase } from '@/lib/server-api';

type Props = { params: Promise<{ handle: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle, slug } = await params;
  const showcase = await getShowcase(handle, slug);
  if (!showcase) return {};
  const { space, post } = showcase;
  const featuredBy = `Featured by ${space.displayName}`;
  // The summary's first sentence is the share line.
  const firstSentence = post?.body.match(/^[^.!?]*[.!?]/)?.[0] ?? post?.body.slice(0, 150);
  return pageMetadata({
    title: post?.title ?? featuredBy,
    description: firstSentence ? `${featuredBy}. ${firstSentence}` : featuredBy,
    path: routes.fan.showcase(handle, slug),
  });
}

export default async function Page({ params }: Props) {
  const { handle, slug } = await params;
  const showcase = await getShowcase(handle, slug);
  if (!showcase) notFound();
  return <ShowcaseView showcase={showcase} shareUrl={appUrl(routes.fan.showcase(handle, slug))} />;
}
