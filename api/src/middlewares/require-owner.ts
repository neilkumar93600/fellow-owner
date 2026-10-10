import type { RequestHandler } from 'express';
import type { Auth } from '../auth/index.js';
import { notFound, unauthorized } from '../lib/errors.js';
import type { MembershipsRepo } from '../repositories/memberships.repo.js';
import type { SpacesRepo } from '../repositories/spaces.repo.js';
import { loadSession } from './require-session.js';

export interface OwnerGuardDeps {
  auth: Auth;
  spaces: Pick<SpacesRepo, 'findByOwnerUserId'>;
  memberships: Pick<MembershipsRepo, 'findByUser'>;
}

/**
 * /api/studio/*: resolves the caller's own space from the session (one space per user in the MVP).
 * 401 when signed out, 404 not_found when the user has no space yet (the web sends them to
 * /onboarding). Sets `req.space` and `req.membership` (the owner membership).
 * Not used on POST /api/studio/space and GET /api/studio/handle-check (session only).
 */
export function requireOwner(deps: OwnerGuardDeps): RequestHandler {
  return async (req, res, next) => {
    const session = await loadSession(deps.auth, req, res);
    if (!session) throw unauthorized();
    const space = await deps.spaces.findByOwnerUserId(session.user.id);
    if (!space) throw notFound('Space');
    req.space = space;
    req.membership = await deps.memberships.findByUser(space.id, session.user.id);
    next();
  };
}
