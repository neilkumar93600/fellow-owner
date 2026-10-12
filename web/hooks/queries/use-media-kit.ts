import type { UpdateMediaKitInput } from '@fellow-owners/shared';
import { skipToken, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { brandKeys } from '@/hooks/queries/use-brands';
import { ensureStudioHandle, studioKeys, useStudioHandle } from '@/hooks/use-space';
import { getMediaKitPreview, updateMediaKitSettings } from '@/lib/api/media-kit';
import { toastError } from '@/lib/toast';

// F6 Media kit (creator side). The public page reads it on the server (lib/server-api.ts getMediaKit).

export const mediaKitKeys = {
  all: ['studio', 'media-kit'] as const,
  preview: ['studio', 'media-kit', 'preview'] as const,
};

/** The media kit as brands will see it, even while it is off. */
export function useMediaKitPreview() {
  const handle = useStudioHandle();
  return useQuery({
    queryKey: mediaKitKeys.preview,
    queryFn: handle ? ({ signal }) => getMediaKitPreview(handle, signal) : skipToken,
  });
}

/**
 * Turn the media kit on or off, set rates and the audience note. Refreshes the preview, the brand
 * settings that show it and the studio space (its public flag shows on the bio page).
 */
export function useUpdateMediaKit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateMediaKitInput) =>
      updateMediaKitSettings(await ensureStudioHandle(queryClient), input),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: mediaKitKeys.all }),
        queryClient.invalidateQueries({ queryKey: brandKeys.settings }),
        queryClient.invalidateQueries({ queryKey: studioKeys.space }),
      ]),
    onError: (error) => toastError(error),
  });
}
