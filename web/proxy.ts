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
// The visitor's IP as Vercel's edge saw it. Railway rewrites X-Forwarded-For on the way in, so the
// API reads this header instead (only alongside a valid edge key).
const EDGE_CLIENT_IP_HEADER = 'x-edge-client-ip';
const isApiPath = (pathname: string) => pathname.startsWith('/api/') || pathname.startsWith('/r/');
// Same rule as next.config.ts.
const API_URL =
  process.env.API_URL ??
  (process.env.NODE_ENV === 'development' ? 'http://localhost:4000' : undefined);

export function proxy(request: NextRequest) {
  if (isApiPath(request.nextUrl.pathname)) {
    const headers = new Headers(request.headers);
    headers.delete(EDGE_KEY_HEADER);
    headers.delete(EDGE_CLIENT_IP_HEADER);
    const key = process.env.INTERNAL_API_KEY;
    if (key) {
      headers.set(EDGE_KEY_HEADER, key);
      // Vercel sets these on requests entering its edge, overwriting anything the client sent.
      const ip =
        request.headers.get('x-real-ip') ??
        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
      if (ip) headers.set(EDGE_CLIENT_IP_HEADER, ip);
    }
    // Rewrite here rather than in next.config.ts: a proxy rewrite reliably carries these request
    // headers to the external API (the config rewrite on Vercel did not).
    if (API_URL) {
      const target = new URL(`${request.nextUrl.pathname}${request.nextUrl.search}`, API_URL);
      return NextResponse.rewrite(target, { request: { headers } });
    }
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
