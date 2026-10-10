import type {
  CommentItem,
  CreateCommentInput,
  PostDetail,
  SignalKind,
  SignalState,
  TeamDecisionInput,
  TeamRequestInput,
  UpdatePostInput,
} from '@fellow-owners/shared';
import { apiFetch } from '@/lib/fetcher';

// Typed client for /api/posts/:id/*. Every route needs a session and membership of the post's space
// (401 signed out, 403 non-members, 404 unknown, deleted or hidden).

function postPath(id: string): string {
  return `/api/posts/${encodeURIComponent(id)}`;
}

/** GET /api/posts/:id: the member view (no AI fields). */
export function getPost(id: string, signal?: AbortSignal): Promise<PostDetail> {
  return apiFetch<PostDetail>(postPath(id), { signal });
}

/** PATCH (author): content within 24 hours (403 edit_window_closed after), status any time. */
export function updatePost(id: string, input: UpdatePostInput): Promise<PostDetail> {
  return apiFetch<PostDetail>(postPath(id), { method: 'PATCH', json: input });
}

/** DELETE (author): soft delete, 204. */
export function deletePost(id: string): Promise<void> {
  return apiFetch<void>(postPath(id), { method: 'DELETE' });
}

/** POST /comments (201): 100 a day per space. */
export function addComment(id: string, input: CreateCommentInput): Promise<CommentItem> {
  return apiFetch<CommentItem>(`${postPath(id)}/comments`, { method: 'POST', json: input });
}

/** DELETE /comments/:commentId (comment author): soft delete, 204. */
export function deleteComment(id: string, commentId: string): Promise<void> {
  return apiFetch<void>(`${postPath(id)}/comments/${encodeURIComponent(commentId)}`, {
    method: 'DELETE',
  });
}

/** PUT /signals/:kind: idempotent; 403 on the viewer's own post. */
export function addSignal(id: string, kind: SignalKind): Promise<SignalState> {
  return apiFetch<SignalState>(`${postPath(id)}/signals/${kind}`, { method: 'PUT' });
}

/** DELETE /signals/:kind: idempotent. */
export function removeSignal(id: string, kind: SignalKind): Promise<SignalState> {
  return apiFetch<SignalState>(`${postPath(id)}/signals/${kind}`, { method: 'DELETE' });
}

/** POST /team: request an open role on a project (409 when filled or already on the team). */
export function requestTeamRole(id: string, input: TeamRequestInput): Promise<PostDetail> {
  return apiFetch<PostDetail>(`${postPath(id)}/team`, { method: 'POST', json: input });
}

/** PATCH /team/:membershipId (project author): accept or decline a request. */
export function decideTeamRole(
  id: string,
  membershipId: string,
  input: TeamDecisionInput,
): Promise<PostDetail> {
  return apiFetch<PostDetail>(`${postPath(id)}/team/${encodeURIComponent(membershipId)}`, {
    method: 'PATCH',
    json: input,
  });
}
