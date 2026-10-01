import type { Env } from '../config/env.js';
import { demoDisabled, internalError } from '../lib/errors.js';
import type { Auth } from './index.js';

export type DemoRole = 'creator' | 'fan';

export interface DemoUser {
  id: string;
  email: string;
  name: string;
}

export interface DemoUsers {
  creator: DemoUser;
  fan: DemoUser;
}

/** Display names of the seeded demo accounts (03: creator Mira Kapoor, fan Arjun). */
export const DEMO_NAMES: Record<DemoRole, string> = {
  creator: 'Mira Kapoor',
  fan: 'Arjun Mehta',
};

export function demoEmailFor(env: Env, as: DemoRole): string {
  return as === 'creator' ? env.DEMO_CREATOR_EMAIL : env.DEMO_FAN_EMAIL;
}

export function isDemoEmail(env: Env, email: string): boolean {
  const normalized = email.trim().toLowerCase();
  return normalized === env.DEMO_CREATOR_EMAIL || normalized === env.DEMO_FAN_EMAIL;
}

export interface DemoSignInResult {
  user: DemoUser;
  /** Better Auth's Set-Cookie values: forward each with res.append('Set-Cookie', value). */
  setCookies: string[];
}

/**
 * Signs into a demo account server-side with DEMO_PASSWORD (POST /api/demo/session).
 * `requestHeaders` should carry the caller's user-agent and x-forwarded-for so the session row
 * records them; never forward the caller's cookies here.
 * Throws 403 demo_disabled when DEMO_ENABLED=false.
 */
export async function signInDemo(
  auth: Auth,
  env: Env,
  as: DemoRole,
  requestHeaders: Headers = new Headers(),
): Promise<DemoSignInResult> {
  if (!env.DEMO_ENABLED) throw demoDisabled();
  const email = demoEmailFor(env, as);
  const { headers, response } = await auth.api.signInEmail({
    body: { email, password: env.DEMO_PASSWORD, rememberMe: true },
    headers: requestHeaders,
    returnHeaders: true,
  });
  const setCookies = headers.getSetCookie();
  if (setCookies.length === 0) throw internalError('Demo sign-in did not return a session');
  return {
    user: { id: response.user.id, email: response.user.email, name: response.user.name },
    setCookies,
  };
}

/**
 * Creates (or repairs) both demo users with a verified email and a credential account whose
 * password is DEMO_PASSWORD. Idempotent; used by the seed and the demo reset.
 * Uses Better Auth's internal adapter because email+password sign-up is disabled for everyone.
 */
export async function ensureDemoUsers(
  auth: Auth,
  env: Env,
  names: Partial<Record<DemoRole, string>> = {},
): Promise<DemoUsers> {
  const ctx = await auth.$context;
  const passwordHash = await ctx.password.hash(env.DEMO_PASSWORD);

  const ensure = async (as: DemoRole): Promise<DemoUser> => {
    const email = demoEmailFor(env, as);
    const name = names[as] ?? DEMO_NAMES[as];
    const found = await ctx.internalAdapter.findUserByEmail(email, { includeAccounts: true });
    let userId: string;
    if (found) {
      userId = found.user.id;
      if (found.user.name !== name || !found.user.emailVerified) {
        await ctx.internalAdapter.updateUser(userId, { name, emailVerified: true });
      }
      const credential = found.accounts.find((a) => a.providerId === 'credential');
      if (!credential) {
        await ctx.internalAdapter.linkAccount({
          userId,
          providerId: 'credential',
          accountId: userId,
          password: passwordHash,
        });
      } else {
        await ctx.internalAdapter.updatePassword(userId, passwordHash);
      }
    } else {
      const created = await ctx.internalAdapter.createUser(
        { email, name, emailVerified: true },
        { method: 'admin' },
      );
      userId = created.id;
      await ctx.internalAdapter.linkAccount({
        userId,
        providerId: 'credential',
        accountId: userId,
        password: passwordHash,
      });
    }
    return { id: userId, email, name };
  };

  return { creator: await ensure('creator'), fan: await ensure('fan') };
}
