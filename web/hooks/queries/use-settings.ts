import type { UpdateSettingsInput } from '@fellow-owners/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateSettings } from '@/api/studio';
import { studioKeys } from '@/hooks/use-space';
import { shouldRetry } from '@/lib/query-client';
import { toastError, toastSuccess } from '@/lib/toast';

/**
 * Saves the profile and/or the taste profile, puts the returned space in the cache and toasts
 * "Saved". A new taste profile bumps tasteVersion, which marks AI scores as stale across the
 * studio, so those views refresh too.
 */
export function useUpdateSettings() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (input: UpdateSettingsInput) => updateSettings(input),
    onSuccess: (space, input) => {
      queryClient.setQueryData(studioKeys.space, space);
      if (input.tasteProfile) {
        queryClient.invalidateQueries({
          queryKey: studioKeys.all,
          predicate: (query) => query.queryKey[1] !== 'space',
        });
      }
      toastSuccess('Saved');
    },
    onError: (error, input) => {
      toastError(error, {
        retry: shouldRetry(0, error)
          ? () => {
              mutation.mutate(input);
            }
          : undefined,
      });
    },
  });
  return mutation;
}
