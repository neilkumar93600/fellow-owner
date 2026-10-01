import { fromNodeHeaders } from 'better-auth/node';
import type { Request, RequestHandler, Response } from 'express';
import type { Auth, AuthSession } from '../auth/index.js';
import { unauthorized } from '../lib/errors.js';

/**
 * Reads the Better Auth session for this request (once) into `req.session`.
 * Set-Cookie headers from a session refresh are forwarded to the response.
 */
export async function loadSession(
  auth: Auth,
  req: Request,
  res: Response,
): Promise<AuthSession | null> {
  if (req.session) return req.session;
  const { headers, response } = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
    returnHeaders: true,
  });
  for (const cookie of headers.getSetCookie()) res.append('Set-Cookie', cookie);
  req.session = response ?? null;
  return req.session;
}

/**
 * Optional session for public routes that "may read the session" (viewer-specific fields).
 * Do not use it on CDN-cached responses: a refreshed session adds Set-Cookie.
 */
export function attachSession(auth: Auth): RequestHandler {
  return async (req, res, next) => {
    await loadSession(auth, req, res);
    next();
  };
}

/** 401 unauthorized unless signed in. Sets `req.session`. */
export function requireSession(auth: Auth): RequestHandler {
  return async (req, res, next) => {
    const session = await loadSession(auth, req, res);
    if (!session) throw unauthorized();
    next();
  };
}

/** The session set by requireSession/attachSession; 401 when there is none. */
export function sessionOf(req: Request): AuthSession {
  if (!req.session) throw unauthorized();
  return req.session;
}

/** The signed-in user's id; 401 when signed out. */
export function userIdOf(req: Request): string {
  return sessionOf(req).user.id;
}
