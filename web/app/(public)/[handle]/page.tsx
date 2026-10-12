import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BioContainer } from '@/components/bio/bio-container';
import { JsonLd } from '@/components/shared/json-ld';
import { routes } from '@/lib/routes';
import { pageMetadata, profilePageJsonLd } from '@/lib/seo';
import { getSpacePage } from '@/lib/server-api';

type Props = { params: Promise<{ handle: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = await getSpacePage((await params).handle);
  if (!page) notFound();
  const { displayName, handle, bio } = page.space;
  // The bio link's own share card (opengraph-image.tsx beside this page) stays.
  return pageMetadata({
    title: `${displayName} (@${handle})`,
    description:
      bio ??
      `${displayName}’s space on Fellow Owners: join the communities, share ideas and make things together.`,
    path: routes.fan.space(handle),
    ogImage: false,
  });
}

export default async function Page({ params }: Props) {
  const page = await getSpacePage((await params).handle);
  if (!page) notFound();
  const { space } = page;
  return (
    <>
      {/* The demo's platform links are made up and may be someone's real handle: no sameAs for it. */}
      <JsonLd
        data={profilePageJsonLd({
          ...space,
          platforms: space.isDemo ? [] : space.platforms,
          path: routes.fan.space(space.handle),
        })}
      />
      <BioContainer initialPage={page} />
    </>
  );
}
