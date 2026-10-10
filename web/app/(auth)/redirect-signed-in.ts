import 'server-only';
import { redirect } from 'next/navigation';
import { routes } from '@/lib/routes';
import { getServerSession } from '@/lib/server-api';

/**
 * Owner rule: a signed-in visitor never sees /login, /create-account or /forgot-password. They go to
 * their `returnTo` (already passed through safeReturnTo: one leading "/", never "//", never an auth
 * path, so no loop) or to /start, which picks Today or onboarding and never sends a signed-in visitor
 * back here. /verify-otp, /reset-password and /sign-out are mid-flow and never call this.
 * The API being down counts as signed out: the page renders and reports its own failure.
 */
export async function redirectIfSignedIn(returnTo: string | null, handle?: string | null) {
  let signedIn = false;
  try {
    signedIn = Boolean((await getServerSession())?.user);
  } catch {
    signedIn = false;
  }
  // redirect() throws a control-flow exception, so it stays outside the try (Next 16 docs).
  if (signedIn) redirect(returnTo ?? routes.start(handle));
}
