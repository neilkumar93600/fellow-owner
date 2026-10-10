import type { Logger } from 'pino';
import type { AuthSession } from '../auth/index.js';
import type { MembershipRow } from '../db/schema/memberships.js';
import type { SpaceRow } from '../db/schema/spaces.js';

// Request fields set by our middlewares. request-id.ts initializes all of them (null/undefined),
// so reading them before the guard that fills them is safe. Prefer the accessors that throw a
// proper AppError when a guard did not run: sessionOf/userIdOf (require-session.ts),
// spaceOf/membershipOf (require-member.ts), queryOf (validate.ts).

declare global {
  namespace Express {
    interface Request {
      /** Incoming `x-request-id` when well-formed, else a new UUID. Echoed in the response. */
      requestId: string;
      /** Child of the root logger bound to `{ reqId }`. */
      log: Logger;
      /** Better Auth `{ session, user }`; filled by attachSession/requireSession, else null. */
      session: AuthSession | null;
      /** The space resolved from `:handle` (requireMember/loadSpace) or the caller's own (requireOwner). */
      space: SpaceRow | null;
      /** The caller's active membership in `req.space` (requireMember/requireOwner). */
      membership: MembershipRow | null;
      /** Parsed `?query` from validate({ query }); Express 5 `req.query` is a read-only getter. */
      validatedQuery: unknown;
    }
  }
}
