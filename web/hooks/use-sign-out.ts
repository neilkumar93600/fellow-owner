'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { signOut } from '@/lib/auth-client';
import { routes } from '@/lib/routes';

/**
 * Ends the session (Better Auth), drops everything cached for the person and lands on /login. Resolves
 * true once signed out; on failure it toasts and resolves false, so the caller can offer another try.
 */
export function useSignOut(): () => Promise<boolean> {
  const router = useRouter();
  const queryClient = useQueryClient();
  return async () => {
    const result = await signOut().catch(() => ({ error: true }));
    if (result && 'error' in result && result.error) {
      toast('Could not sign out', { description: 'Check your connection and try again.' });
      return false;
    }
    queryClient.clear();
    router.replace(routes.auth.login());
    return true;
  };
}
