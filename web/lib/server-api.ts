import 'server-only';
import type { Showcase, SpacePage, StudioSpace, ViewerMembership } from '@fellow-owners/shared';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import type { authClient } from '@/lib/auth-client';
import { ApiError, apiFetch } from '@/lib/fetcher';

// Server components and layouts call the Express API directly (no rewrite hop). Signed-in reads carry the
// visitor's cookies and are never cached; public reads carry no cookies and are cached for 60 seconds,
// like the API's own CDN header.

/** Same rule as next.config.ts: API_URL, else the local API in development. */
function apiUrl(path: string): string {
  const base =
    process.env.API_URL ??
    (process.env.NODE_ENV === 'development' ? 'http://localhost:4000' : undefined);
  if (!base) throw new Error('API_URL is not set');
  return `${base}${path}`;
}

async function signedIn<T>(path: string): Promise<T> {
  const cookie = (await headers()).get('cookie');
  return apiFetch<T>(apiUrl(path), { cache: 'no-store', headers: cookie ? { cookie } : {} });
}

/** Unknown or malformed handles and slugs (404, or 400 from the params check) are a missing page. */
function isMissing(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 404 || error.status === 400);
}

async function cachedOrNull<T>(
  path: string,
  init: RequestInit & { next?: { revalidate: number } } = { next: { revalidate: 60 } },
): Promise<T | null> {
  try {
    return await apiFetch<T>(apiUrl(path), init);
  } catch (error) {
    if (isMissing(error)) return null;
    throw error;
  }
}

type Jsonify<T> = T extends Date
  ? string
  : T extends object
    ? { [K in keyof T]: Jsonify<T[K]> }
    : T;

/** Better Auth's session as the server receives it: the client's shape with dates as ISO strings. */
export type ServerSession = Jsonify<typeof authClient.$Infer.Session>;

/** GET /api/auth/get-session: `{ session, user }`, or null when signed out. */
export function getServerSession(): Promise<ServerSession | null> {
  return signedIn<ServerSession | null>('/api/auth/get-session');
}

/** GET /api/studio/space: the visitor's own space; 401 is `unauthorized`, 404 (no space yet) `no-space`. */
export async function getStudioSpace(): Promise<
  { space: StudioSpace } | { error: 'unauthorized' | 'no-space' }
> {
  try {
    return { space: await signedIn<StudioSpace>('/api/studio/space') };
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return { error: 'unauthorized' };
    if (error instanceof ApiError && error.status === 404) return { error: 'no-space' };
    throw error;
  }
}

/** GET /api/spaces/:handle: the public bio page, or null for an unknown handle. */
export function getSpacePage(handle: string): Promise<SpacePage | null> {
  return cachedOrNull<SpacePage>(`/api/spaces/${encodeURIComponent(handle)}`);
}

/**
 * The same page read fresh (no-store) for the signed-in fan area, so a community created a moment ago
 * resolves at once. React cache() shares the read between the layout, generateMetadata and the page.
 * The public bio route keeps getSpacePage's 60 s cache: per-fetch options never change a route's rendering.
 */
export const getFreshSpacePage = cache((handle: string): Promise<SpacePage | null> => {
  return cachedOrNull<SpacePage>(`/api/spaces/${encodeURIComponent(handle)}`, {
    cache: 'no-store',
  });
});

/** GET /api/spaces/:handle/showcase/:slug: a promoted project, or null when there is none. */
export function getShowcase(handle: string, slug: string): Promise<Showcase | null> {
  return cachedOrNull<Showcase>(
    `/api/spaces/${encodeURIComponent(handle)}/showcase/${encodeURIComponent(slug)}`,
  );
}

/**
 * GET /api/spaces/:handle/membership: who the visitor is in this space (signed out allowed).
 * An unknown handle renders the 404 page (notFound), so it is safe inside Promise.all.
 */
export async function getViewerMembership(handle: string): Promise<ViewerMembership> {
  try {
    return await signedIn<ViewerMembership>(`/api/spaces/${encodeURIComponent(handle)}/membership`);
  } catch (error) {
    if (isMissing(error)) notFound();
    throw error;
  }
}
