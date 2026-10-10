import type {
  CommentModerationInput,
  CreateReportInput,
  ReportActionInput,
  ReportItem,
  ReportsPage,
  ReportsQuery,
} from '@fellow-owners/shared';
import { type Params, query } from '@/api/studio';
import { apiFetch } from '@/lib/fetcher';

// Typed client for reports, comment moderation and leaving a space (F25).

const at = (segment: string) => encodeURIComponent(segment);

/** POST /api/posts/:postId/report : members only; reporting the same post again is a quiet 200. */
export async function reportPost(postId: string, input: CreateReportInput): Promise<void> {
  await apiFetch(`/api/posts/${at(postId)}/report`, {
    method: 'POST',
    json: input,
  });
}

/** POST /api/comments/:commentId/report */
export async function reportComment(commentId: string, input: CreateReportInput): Promise<void> {
  await apiFetch(`/api/comments/${at(commentId)}/report`, {
    method: 'POST',
    json: input,
  });
}

/** DELETE /api/spaces/:handle/me : leave the space (400 for its owner). */
export async function leaveSpace(handle: string): Promise<void> {
  await apiFetch(`/api/spaces/${at(handle)}/me`, { method: 'DELETE' });
}

/** GET /api/studio/reports : the owner's queue, newest first. */
export function listReports(
  params: Params<ReportsQuery> = {},
  signal?: AbortSignal,
): Promise<ReportsPage> {
  return apiFetch<ReportsPage>(`/api/studio/reports${query(params)}`, {
    signal,
  });
}

/** PATCH /api/studio/reports/:id : resolve, dismiss, or hide the reported post or comment. */
export function actOnReport(id: string, input: ReportActionInput): Promise<ReportItem> {
  return apiFetch<ReportItem>(`/api/studio/reports/${at(id)}`, {
    method: 'PATCH',
    json: input,
  });
}

/** PATCH /api/studio/posts/:postId/comments/:commentId : hide or unhide a comment. */
export async function moderateComment(
  postId: string,
  commentId: string,
  input: CommentModerationInput,
): Promise<void> {
  await apiFetch(`/api/studio/posts/${at(postId)}/comments/${at(commentId)}`, {
    method: 'PATCH',
    json: input,
  });
}
