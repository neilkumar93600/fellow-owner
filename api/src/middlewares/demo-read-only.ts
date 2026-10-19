import type { Request, RequestHandler } from 'express';
import { isDemoEmail } from '../auth/demo.js';
import type { Env } from '../config/env.js';
import { forbidden } from '../lib/errors.js';
import { sessionOf } from './require-session.js';

/**
 * 403 for the shared demo accounts on routes that change what every visitor sees (the public
 * /mira page, media kit, rooms). Mount after the session / owner middleware. `applies` narrows it
 * to the requests that really change that (default: every request on the route).
 */
export function demoReadOnly(
  env: Env,
  applies: (req: Request) => boolean = () => true,
): RequestHandler {
  return (req, _res, next) => {
    if (applies(req) && isDemoEmail(env, sessionOf(req).user.email)) {
      throw forbidden('This is read-only in the demo.');
    }
    next();
  };
}
