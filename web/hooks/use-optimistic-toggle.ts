'use client';

import { useOptimistic, useTransition } from 'react';
import { toastError } from '@/lib/toast';

/**
 * Shows `next` at once while `commit` saves it (signals, pitch status), and falls back to `value`, the
 * server truth, when it fails, with a persistent error toast that can retry. `commit` should resolve
 * once the cache holds the new value (setQueryData, or an awaited invalidateQueries) so nothing flickers
 * back when the optimistic value ends.
 */
export function useOptimisticToggle<T>(
  value: T,
  commit: (next: T) => Promise<unknown>,
  opts: { fallback?: string } = {},
): { value: T; set: (next: T) => void; pending: boolean } {
  const [optimistic, setOptimistic] = useOptimistic(value);
  const [pending, startTransition] = useTransition();

  function set(next: T) {
    startTransition(async () => {
      setOptimistic(next);
      try {
        await commit(next);
      } catch (error) {
        toastError(error, { retry: () => set(next), fallback: opts.fallback });
      }
    });
  }

  return { value: optimistic, set, pending };
}
