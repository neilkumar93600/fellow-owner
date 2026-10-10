import type { NotificationPrefs, NotificationPrefsInput } from '@fellow-owners/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getNotificationPrefs, updateNotificationPrefs } from '@/api/notification-prefs';
import { toastError } from '@/lib/toast';

export const notificationPrefsKeys = { all: ['notification-prefs'] as const };

/** The signed-in person's notification email settings. */
export function useNotificationPrefs() {
  return useQuery({
    queryKey: notificationPrefsKeys.all,
    queryFn: ({ signal }) => getNotificationPrefs(signal),
  });
}

/** Saves a switch at once: the cache changes first and rolls back with a toast when the save fails. */
export function useUpdateNotificationPrefs() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NotificationPrefsInput) => updateNotificationPrefs(input),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: notificationPrefsKeys.all });
      const previous = queryClient.getQueryData<NotificationPrefs>(notificationPrefsKeys.all);
      queryClient.setQueryData<NotificationPrefs>(
        notificationPrefsKeys.all,
        (old) =>
          old && {
            ...old,
            emailEnabled: input.emailEnabled,
            unsubscribed: input.emailEnabled ? false : old.unsubscribed,
            kinds: { ...old.kinds, ...input.kinds },
          },
      );
      return { previous };
    },
    onError: (error, _input, context) => {
      if (context?.previous) queryClient.setQueryData(notificationPrefsKeys.all, context.previous);
      toastError(error);
    },
    onSuccess: (prefs) => queryClient.setQueryData(notificationPrefsKeys.all, prefs),
  });
}
