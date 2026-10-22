import type { MetadataRoute } from 'next';
import { POSTS } from '@/lib/blog';
import { appUrl } from '@/lib/env';
import { LEGAL_PAGES, LEGAL_UPDATED } from '@/lib/legal';
import { routes } from '@/lib/routes';
import { getSpacePage } from '@/lib/server-api';

// Prerendered, then regenerated in the background as the bio reads' 60 s fetch cache expires.

/** Lists every public creator: { spaces: [{ handle }] }. API down: this hour's file has no creators. */
const CREATORS_PATH = '/api/sitemap';
/** 200 when the creator turned their media kit on; 404 (off or unknown) and 501 (not built yet) skip it. */
const mediaKitPath = (handle: string) => `/api/spaces/${encodeURIComponent(handle)}/media-kit`;

/** A GET on the API (same base rule as lib/server-api.ts); null for anything but a 2xx, never a throw. */
async function apiGet<T>(path: string): Promise<T | null> {
  const base =
    process.env.API_URL ??
    (process.env.NODE_ENV === 'development' ? 'http://localhost:4000' : undefined);
  if (!base) return null;
  const key = process.env.INTERNAL_API_KEY;
  try {
    const res = await fetch(`${base}${path}`, {
      headers: {
        Accept: 'application/json',
        ...(key ? { 'x-internal-key': key } : {}),
      },
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(8000),
    });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

const newest = (dates: string[]): string | undefined =>
  dates.length > 0 ? dates.reduce((a, b) => (a > b ? a : b)) : undefined;

/** One creator's public pages: the bio link, each live showcase, and the media kit when it is on. */
async function creatorPages(handle: string): Promise<MetadataRoute.Sitemap> {
  try {
    const [page, mediaKit] = await Promise.all([
      getSpacePage(handle),
      apiGet<unknown>(mediaKitPath(handle)),
    ]);
    if (!page) return [];
    const { space, featured, spotlights } = page;
    return [
      {
        url: appUrl(routes.fan.space(space.handle)),
        lastModified: newest([
          ...featured.map((item) => item.publishedAt),
          ...spotlights.map((item) => item.spotlightAt),
        ]),
      },
      ...featured.map((item) => ({
        url: appUrl(routes.fan.showcase(space.handle, item.showcaseSlug)),
        lastModified: item.publishedAt,
      })),
      ...(mediaKit ? [{ url: appUrl(`${routes.fan.space(space.handle)}/media-kit`) }] : []),
    ];
  } catch {
    // The API is down or the page failed: leave this creator out of this hour's file.
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const listed = await apiGet<{ spaces?: { handle: string }[] }>(CREATORS_PATH);
  const handles = listed?.spaces?.map((space) => space.handle) ?? [];
  // ponytail: one bio read per creator in parallel; past a few hundred creators let /api/sitemap return
  // the showcases and media-kit flags too.
  const creators = (await Promise.all(handles.map(creatorPages))).flat();

  // Pages without a date source (home, about, pricing, contact) carry no lastModified rather than a guess.
  return [
    { url: appUrl(routes.home()) },
    { url: appUrl(routes.marketing.about()) },
    { url: appUrl(routes.marketing.pricing()) },
    { url: appUrl(routes.marketing.contact()) },
    {
      url: appUrl(routes.marketing.blog()),
      lastModified: newest(POSTS.map((post) => post.date)),
    },
    ...POSTS.map((post) => ({
      url: appUrl(`/blog/${post.slug}`),
      lastModified: post.date,
    })),
    ...LEGAL_PAGES.map((page) => ({
      url: appUrl(page.href),
      lastModified: LEGAL_UPDATED,
    })),
    ...creators,
  ];
}
