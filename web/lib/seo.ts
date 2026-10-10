import type { Metadata } from 'next';
import { SITE } from '@/lib/constants';

/**
 * Page metadata. `title` goes through the root template ("Mira Lane · Fellow Owners"); `path` sets
 * the canonical and og:url, resolved against the root layout's metadataBase. Open Graph is written in
 * full because Next replaces, not merges, a parent's openGraph. `noindex` keeps signed-in and
 * fan-only pages out of search results.
 */
export function pageMetadata({
  title,
  description,
  path,
  noindex = false,
}: {
  title: string;
  description?: string;
  path?: string;
  noindex?: boolean;
}): Metadata {
  return {
    title,
    ...(description ? { description } : {}),
    ...(path ? { alternates: { canonical: path } } : {}),
    openGraph: {
      type: 'website',
      siteName: SITE.name,
      title,
      ...(description ? { description } : {}),
      ...(path ? { url: path } : {}),
    },
    ...(noindex ? { robots: { index: false, follow: false } } : {}),
  };
}
