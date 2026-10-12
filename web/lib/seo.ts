import type { Metadata } from 'next';
import { SITE, SOCIAL_LINKS } from '@/lib/constants';
import { appUrl } from '@/lib/env';
import { CONTACT, OPERATOR } from '@/lib/legal';

/** The site's share card, app/opengraph-image.tsx (served at /opengraph-image). */
export const DEFAULT_OG_IMAGE = {
  url: '/opengraph-image',
  width: 1200,
  height: 630,
  alt: `${SITE.name}: ${SITE.tagline}`,
};

/**
 * Page metadata. `title` goes through the root template ("About · Fellow Owners"); `path` sets the
 * canonical and og:url, resolved against the root layout's metadataBase. Open Graph is written in full
 * (the default share card included) because Next replaces, not merges, a parent's openGraph. A page with
 * its own opengraph-image file beside it (the bio link, a showcase) passes `ogImage: false` so that file
 * wins. `noindex` keeps signed-in, per-visitor and fan-only pages out of search results.
 */
export function pageMetadata({
  title,
  description,
  path,
  noindex = false,
  ogImage = true,
  publishedTime,
}: {
  title: string;
  description?: string;
  path?: string;
  noindex?: boolean;
  ogImage?: boolean;
  /** An article (a blog post): sets og:type article with its date. */
  publishedTime?: string;
}): Metadata {
  return {
    title,
    ...(description ? { description } : {}),
    ...(path ? { alternates: { canonical: path } } : {}),
    openGraph: {
      ...(publishedTime ? { type: 'article', publishedTime } : { type: 'website' }),
      siteName: SITE.name,
      title,
      ...(description ? { description } : {}),
      ...(path ? { url: path } : {}),
      ...(ogImage ? { images: [DEFAULT_OG_IMAGE] } : {}),
    },
    ...(noindex ? { robots: { index: false, follow: false } } : {}),
  };
}

// ---------------------------------------------------------------- structured data (JSON-LD)

const ORGANIZATION_ID = appUrl('/#organization');

/** Organization + WebSite for the home page. Facts come only from shared OPERATOR / CONTACT: no phone. */
export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': ORGANIZATION_ID,
        name: SITE.name,
        legalName: OPERATOR.entity,
        url: appUrl('/'),
        logo: appUrl('/icon-512.png'),
        description: SITE.description,
        email: CONTACT.support,
        address: OPERATOR.address,
        sameAs: SOCIAL_LINKS.map((link) => link.href),
        contactPoint: [
          {
            '@type': 'ContactPoint',
            contactType: 'customer support',
            email: CONTACT.support,
          },
          {
            '@type': 'ContactPoint',
            contactType: 'privacy',
            email: CONTACT.privacy,
          },
        ],
      },
      {
        '@type': 'WebSite',
        '@id': appUrl('/#website'),
        url: appUrl('/'),
        name: SITE.name,
        description: SITE.description,
        inLanguage: 'en',
        publisher: { '@id': ORGANIZATION_ID },
      },
    ],
  };
}

export interface Crumb {
  name: string;
  /** Site path; the last crumb is the current page. */
  path: string;
}

/** BreadcrumbList for a trail that starts at the home page. */
export function breadcrumbJsonLd(crumbs: readonly Crumb[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: appUrl(crumb.path),
    })),
  };
}

/** A creator's bio page as a ProfilePage about a Person (Google's profile page markup). */
export function profilePageJsonLd({
  handle,
  displayName,
  bio,
  avatarUrl,
  platforms,
  totalFollowers,
  path,
}: {
  handle: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  platforms: readonly { url: string }[];
  totalFollowers: number;
  path: string;
}) {
  // An uploaded avatar can be a data: URL; only a real address is worth naming.
  const image = avatarUrl && !avatarUrl.startsWith('data:') ? appUrl(avatarUrl) : undefined;
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    url: appUrl(path),
    mainEntity: {
      '@type': 'Person',
      name: displayName,
      alternateName: `@${handle}`,
      identifier: handle,
      url: appUrl(path),
      ...(bio ? { description: bio } : {}),
      ...(image ? { image } : {}),
      ...(platforms.length > 0 ? { sameAs: platforms.map((platform) => platform.url) } : {}),
      interactionStatistic: {
        '@type': 'InteractionCounter',
        interactionType: 'https://schema.org/FollowAction',
        userInteractionCount: totalFollowers,
      },
    },
  };
}
