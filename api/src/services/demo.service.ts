import type { DemoSessionResponse } from '@fellow-owners/shared';
import { type DemoRole, signInDemo } from '../auth/demo.js';
import type { Auth } from '../auth/index.js';
import type { Env } from '../config/env.js';
import type { Repos } from '../repositories/index.js';

export interface DemoServiceDeps {
  env: Env;
  auth: Auth;
  repos: Repos;
}

export interface DemoSessionResult {
  /** Better Auth's Set-Cookie values: append each one to the response. */
  setCookies: string[];
  body: DemoSessionResponse;
}

/**
 * POST /api/demo/session (02-trd §4, 03-app-flow J7): signs into a seeded demo account on the
 * server and says where to send the browser. The creator lands on Today, the fan on the demo
 * bio page. Throws 403 demo_disabled when DEMO_ENABLED=false (auth/demo.ts).
 */
export function createDemoService(deps: DemoServiceDeps) {
  return {
    async session(as: DemoRole, requestHeaders: Headers): Promise<DemoSessionResult> {
      const { setCookies } = await signInDemo(deps.auth, deps.env, as, requestHeaders);
      return { setCookies, body: { as, redirectTo: await redirectFor(deps.repos, as) } };
    },
  };
}

export type DemoService = ReturnType<typeof createDemoService>;

async function redirectFor(repos: Repos, as: DemoRole): Promise<string> {
  if (as === 'creator') return '/dashboard';
  const [space] = await repos.spaces.listDemo();
  // ponytail: no seeded demo space (fresh database) sends the fan home rather than to a 404.
  return space ? `/${space.handle}` : '/';
}
