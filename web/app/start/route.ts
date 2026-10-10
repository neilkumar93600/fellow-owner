import { redirect } from 'next/navigation';
import type { NextRequest } from 'next/server';
import { routes, withQuery } from '@/lib/routes';
import { getStudioSpace } from '@/lib/server-api';

/** A handle shape we pass through to pre-fill create-account; anything else is dropped. */
const HANDLE = /^[a-z0-9_.]{1,30}$/;

/**
 * GET /start: the single "Get started" target for the navbar and the hero (owner rule: one button).
 * The session cookie decides, on the server, so a signed-in visitor never sees an auth page:
 * - signed in with a space -> Today
 * - signed in without a space -> onboarding
 * - signed out (or the API is unreachable) -> create account, then onboarding
 * The optional `handle` from the hero's claim bar rides along so the form can pre-fill it.
 */
export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get('handle')?.trim().toLowerCase() ?? '';
  const handle = HANDLE.test(raw) ? raw : null;

  // One withQuery call: routes.auth.createAccount() already carries a query string.
  let target = withQuery('/create-account', { returnTo: routes.onboarding(), handle });
  try {
    const result = await getStudioSpace();
    if ('space' in result) target = routes.dashboard.today();
    else if (result.error === 'no-space') target = withQuery(routes.onboarding(), { handle });
  } catch {
    // API down: create account is still the right first step; it reports its own failure.
  }
  // redirect() throws a control-flow exception, so it stays outside the try (Next 16 docs).
  redirect(target);
}
