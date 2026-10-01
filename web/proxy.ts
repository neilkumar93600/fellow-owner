import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// Convenience gate only: sends signed-out visitors to /login before signed-in pages render.
// Authorization always happens in the API (02-trd §2).
const SESSION_COOKIES = ['better-auth.session_token', '__Secure-better-auth.session_token'];

export function proxy(request: NextRequest) {
  const hasSession = SESSION_COOKIES.some((name) => request.cookies.has(name));
  if (hasSession) return NextResponse.next();

  const url = request.nextUrl.clone();
  const returnTo = `${request.nextUrl.pathname}${request.nextUrl.search}`;
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
