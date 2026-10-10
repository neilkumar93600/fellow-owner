import type { ReportItem, ReportStatus, ReportsPage } from '@fellow-owners/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { actOnReport, listReports, reportComment, reportPost } from '@/lib/api/moderation';
import { toastError, toastSuccess } from '@/lib/toast';

export const reportKeys = {
  all: ['studio', 'reports'] as const,
  list: (status: ReportStatus) => ['studio', 'reports', status] as const,
};

/** The owner's report queue for one status, newest first. */
export function useReports(status: ReportStatus) {
  return useQuery({
    queryKey: reportKeys.list(status),
    queryFn: ({ signal }) => listReports({ status, limit: 50 }, signal),
  });
}

/** Open reports waiting for the owner (the Today notice). */
export function useOpenReportCount() {
  return useQuery({
    queryKey: [...reportKeys.all, 'count'],
    queryFn: ({ signal }) => listReports({ status: 'open', limit: 1 }, signal),
    select: (page: ReportsPage) => page.openCount,
  });
}

/** Resolve, dismiss or hide what was reported; the queue refetches after. */
export function useActOnReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'resolve' | 'dismiss' | 'hide_target' }) =>
      actOnReport(id, { action }) as Promise<ReportItem>,
    onSuccess: (_item, { action }) => {
      toastSuccess(action === 'hide_target' ? 'Hidden from members' : 'Report closed');
      void queryClient.invalidateQueries({ queryKey: reportKeys.all });
    },
    onError: (error) => toastError(error),
  });
}

/** A member reports a post or a comment. */
export function useFileReport() {
  return useMutation({
    mutationFn: ({
      target,
      id,
      reason,
      note,
    }: {
      target: 'post' | 'comment';
      id: string;
      reason: Parameters<typeof reportPost>[1]['reason'];
      note?: string;
    }) => {
      const input = { reason, ...(note ? { note } : {}) };
      return target === 'post' ? reportPost(id, input) : reportComment(id, input);
    },
    onSuccess: () => toastSuccess('Thanks. The space owner will take a look.'),
    onError: (error) => toastError(error),
  });
}
