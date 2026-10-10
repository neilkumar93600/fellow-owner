'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { ApiError } from '@/lib/fetcher';
import { routes } from '@/lib/routes';

/**
 * A member read answered 401 (session gone) or 403 (not a member): sends the visitor to sign in or Join,
 * then back to `returnTo`. True while that redirect is under way, so the screen keeps its skeleton.
 */
export function useMemberRedirect(handle: string, error: unknown, returnTo: string): boolean {
  const router = useRouter();
  const status = error instanceof ApiError ? error.status : 0;
  const target =
    status === 401
      ? routes.auth.login(returnTo)
      : status === 403
        ? routes.fan.join(handle, returnTo)
        : null;

  useEffect(() => {
    if (target) router.replace(target);
  }, [target, router]);

  return target !== null;
}
