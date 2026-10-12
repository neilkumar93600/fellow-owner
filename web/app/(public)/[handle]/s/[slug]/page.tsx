import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Breadcrumbs } from '@/components/shared/breadcrumbs';
import { ShowcaseView } from '@/components/showcase/showcase-view';
import { appUrl } from '@/lib/env';
import { routes } from '@/lib/routes';
import { pageMetadata } from '@/lib/seo';
import { getShowcase } from '@/lib/server-api';

type Props = { params: Promise<{ handle: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle, slug } = await params;
  const showcase = await getShowcase(handle, slug);
  if (!showcase) notFound();
  const { space, post } = showcase;
  const featuredBy = `Featured by ${space.displayName}`;
  // The summary's first sentence is the share line.
  const firstSentence = post?.body.match(/^[^.!?]*[.!?]/)?.[0] ?? post?.body.slice(0, 150);
  return pageMetadata({
    title: post?.title ?? featuredBy,
    description: firstSentence ? `${featuredBy}. ${firstSentence}` : featuredBy,
    path: routes.fan.showcase(handle, slug),
    // The showcase's own share card (opengraph-image.tsx beside this page) stays.
    ogImage: false,
  });
}

export default async function Page({ params }: Props) {
  const { handle, slug } = await params;
  const showcase = await getShowcase(handle, slug);
  if (!showcase) notFound();
  const { space, post } = showcase;
  return (
    <>
      <Breadcrumbs
        className="mb-3"
        crumbs={[
          { name: space.displayName, path: routes.fan.space(space.handle) },
          { name: post?.title ?? 'Featured project', path: routes.fan.showcase(handle, slug) },
        ]}
      />
      <ShowcaseView showcase={showcase} shareUrl={appUrl(routes.fan.showcase(handle, slug))} />
    </>
  );
}
