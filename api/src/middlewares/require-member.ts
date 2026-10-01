import type { Request, RequestHandler } from 'express';
import type { Auth } from '../auth/index.js';
import type { MembershipRow } from '../db/schema/memberships.js';
import type { SpaceRow } from '../db/schema/spaces.js';
import { forbidden, notFound, unauthorized } from '../lib/errors.js';
import type { MembershipsRepo } from '../repositories/memberships.repo.js';
import type { SpacesRepo } from '../repositories/spaces.repo.js';
import { loadSession } from './require-session.js';

export interface SpaceGuardDeps {
  spaces: Pick<SpacesRepo, 'findByHandle'>;
}

export interface MemberGuardDeps extends SpaceGuardDeps {
  auth: Auth;
  memberships: Pick<MembershipsRepo, 'findByUser'>;
}

function handleParam(req: Request): string {
  const raw = req.params.handle;
  return (typeof raw === 'string' ? raw : '').trim().toLowerCase();
}

/** Public routes on /:handle: resolves the space into `req.space`, 404 not_found when unknown. */
export function loadSpace(deps: SpaceGuardDeps): RequestHandler {
  return async (req, _res, next) => {
    const space = await deps.spaces.findByHandle(handleParam(req));
    if (!space) throw notFound('Space');
    req.space = space;
    next();
  };
}

/**
 * Member routes on /:handle: requires a session (401), resolves the space (404) and the caller's
 * active membership (403 forbidden when none or removed). Sets `req.space` and `req.membership`.
 * The owner passes too (owners hold an `owner` membership). A pitch-only membership (no
 * communities) is a valid member here.
 */
export function requireMember(deps: MemberGuardDeps): RequestHandler {
  return async (req, res, next) => {
    const session = await loadSession(deps.auth, req, res);
    if (!session) throw unauthorized();
    const space = await deps.spaces.findByHandle(handleParam(req));
    if (!space) throw notFound('Space');
    const membership = await deps.memberships.findByUser(space.id, session.user.id);
    if (!membership || membership.removedAt) throw forbidden('Join this space first');
    req.space = space;
    req.membership = membership;
    next();
  };
}

/** The space resolved by loadSpace/requireMember/requireOwner; 404 when none ran. */
export function spaceOf(req: Request): SpaceRow {
  if (!req.space) throw notFound('Space');
  return req.space;
}

/** The caller's membership resolved by requireMember/requireOwner; 403 when none. */
export function membershipOf(req: Request): MembershipRow {
  if (!req.membership) throw forbidden('Join this space first');
  return req.membership;
}
