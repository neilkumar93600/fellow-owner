import type { RequestHandler } from 'express';
import type { Auth } from '../auth/index.js';
import { forbidden, unauthorized } from '../lib/errors.js';
import { loadSession } from './require-session.js';

/** 401 signed out, 403 unless the session email is in ADMIN_EMAILS (already lowercased by env). */
export function requireAdmin(auth: Auth, adminEmails: readonly string[]): RequestHandler {
  return async (req, res, next) => {
    const session = await loadSession(auth, req, res);
    if (!session) throw unauthorized();
    if (!adminEmails.includes(session.user.email.toLowerCase())) throw forbidden();
    next();
  };
}
