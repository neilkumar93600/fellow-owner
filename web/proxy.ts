import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// Convenience gate only: sends signed-out visitors to /login before signed-in pages render.
// Authorization always happens in the API (02-trd §2). A signed-in request carries its own path and query
// as RETURN_TO_HEADER (read in app/(dashboard)/dashboard/layout.tsx), so a layout that finds the session stale can send the visitor back after sign-in.
const RETURN_TO_HEADER = 'x-return-to';
const SESSION_COOKIES = ['better-auth.session_token', '__Secure-better-auth.session_token'];

export function proxy(request: NextRequest) {
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
    '/dashboard/:path*',
    '/onboarding',
    '/:handle/c/:path*',
    '/:handle/p/:path*',
    '/:handle/new',
    '/:handle/pitch',
    '/:handle/me',
  ],
};
