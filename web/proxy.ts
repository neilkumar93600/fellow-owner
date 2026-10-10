import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// Convenience gate only: sends signed-out visitors to /login before signed-in pages render.
// Authorization always happens in the API (02-trd §2). A signed-in request carries its own path and query
// as RETURN_TO_HEADER (read in app/(dashboard)/dashboard/layout.tsx), so a layout that finds the session stale can send the visitor back after sign-in.
const RETURN_TO_HEADER = 'x-return-to';
const SESSION_COOKIES = ['better-auth.session_token', '__Secure-better-auth.session_token'];

// Requests the next.config.ts rewrite sends to the API. EDGE_KEY_HEADER (INTERNAL_API_KEY, server
// side only, never in a response) tells the API this request came through here, so it may trust
// the client IP Vercel put in X-Forwarded-For (api/src/lib/client-ip.ts). Limits still apply.
const EDGE_KEY_HEADER = 'x-edge-key';
const isApiPath = (pathname: string) => pathname.startsWith('/api/') || pathname.startsWith('/r/');

export function proxy(request: NextRequest) {
  if (isApiPath(request.nextUrl.pathname)) {
    const headers = new Headers(request.headers);
    headers.delete(EDGE_KEY_HEADER);
    const key = process.env.INTERNAL_API_KEY;
    if (key) headers.set(EDGE_KEY_HEADER, key);
    return NextResponse.next({ request: { headers } });
  }

  const hasSession = SESSION_COOKIES.some((name) => request.cookies.has(name));
  const returnTo = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  if (hasSession) {
    const headers = new Headers(request.headers);
    headers.set(RETURN_TO_HEADER, returnTo);
    return NextResponse.next({ request: { headers } });
  }

  const url = request.nextUrl.clone();
  url.pathname = '/login';
  url.search = `?returnTo=${encodeURIComponent(returnTo)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    '/api/:path*',
    '/r/:path*',
    '/dashboard/:path*',
    '/onboarding',
    '/:handle/c/:path*',
    '/:handle/p/:path*',
    '/:handle/new',
    '/:handle/pitch',
    '/:handle/me',
  ],
};
