'use client';

import { authClient } from '@/lib/auth-client';

type ClientSession = typeof authClient.$Infer.Session;

/** The signed-in person (Better Auth). `session` and `user` are null when signed out or still loading. */
export function useSession(): {
  session: ClientSession['session'] | null;
  user: ClientSession['user'] | null;
  isPending: boolean;
  refetch: () => Promise<void>;
} {
  const { data, isPending, refetch } = authClient.useSession();
  return {
    session: data?.session ?? null,
    user: data?.user ?? null,
    isPending,
    refetch: () => refetch(),
  };
}
