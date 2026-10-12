import type {
  BackingState,
  BackProjectInput,
  BeforeQuery,
  CreatePollInput,
  CreateProjectUpdateInput,
  FeedbackWantedState,
  FollowState,
  Poll,
  PollVoteInput,
  ProjectUpdate,
  ProjectUpdatesPage,
} from '@fellow-owners/shared';
import { beforeSearch } from '@/lib/api/posts';
import { apiFetch } from '@/lib/fetcher';

// Typed client for F4 Fan collaboration: polls, project updates, "feedback wanted" and follows on
// /api/posts/:id/... (members: 401 signed out, 403 non-members, 404 unknown or hidden), and the
// creator's "Back this project" on /api/spaces/:handle/posts/:postId/back (owner).

const post = (id: string) => `/api/posts/${encodeURIComponent(id)}`;

/** GET /api/posts/:id/poll (404 when the post has none). */
export function getPoll(postId: string, signal?: AbortSignal): Promise<Poll> {
  return apiFetch<Poll>(`${post(postId)}/poll`, { signal });
}

/** POST /api/posts/:id/poll (201, the post author; 409 when it already has one). */
export function createPoll(postId: string, input: CreatePollInput): Promise<Poll> {
  return apiFetch<Poll>(`${post(postId)}/poll`, { method: 'POST', json: input });
}

/** PUT /api/posts/:id/poll/vote : the viewer's choices (replaces earlier ones while open). */
export function votePoll(postId: string, input: PollVoteInput): Promise<Poll> {
  return apiFetch<Poll>(`${post(postId)}/poll/vote`, { method: 'PUT', json: input });
}

/** POST /api/posts/:id/poll/close (post author or the creator). */
export function closePoll(postId: string): Promise<Poll> {
  return apiFetch<Poll>(`${post(postId)}/poll/close`, { method: 'POST' });
}

/** GET /api/posts/:id/updates?before=&limit= : the project's timeline, newest first. */
export function getProjectUpdates(
  postId: string,
  params: BeforeQuery = {},
  signal?: AbortSignal,
): Promise<ProjectUpdatesPage> {
  return apiFetch<ProjectUpdatesPage>(`${post(postId)}/updates${beforeSearch(params)}`, {
    signal,
  });
}

/** POST /api/posts/:id/updates (201, the project author or an accepted crew member). */
export function createProjectUpdate(
  postId: string,
  input: CreateProjectUpdateInput,
): Promise<ProjectUpdate> {
  return apiFetch<ProjectUpdate>(`${post(postId)}/updates`, { method: 'POST', json: input });
}

/** DELETE /api/posts/:id/updates/:updateId (204) */
export function deleteProjectUpdate(postId: string, updateId: string): Promise<void> {
  return apiFetch<void>(`${post(postId)}/updates/${encodeURIComponent(updateId)}`, {
    method: 'DELETE',
  });
}

/** PUT (on) or DELETE (off) /api/posts/:id/feedback-wanted (the project author). */
export function setFeedbackWanted(postId: string, on: boolean): Promise<FeedbackWantedState> {
  return apiFetch<FeedbackWantedState>(`${post(postId)}/feedback-wanted`, {
    method: on ? 'PUT' : 'DELETE',
  });
}

/** PUT (follow) or DELETE (unfollow) /api/posts/:id/follow */
export function setFollowing(postId: string, on: boolean): Promise<FollowState> {
  return apiFetch<FollowState>(`${post(postId)}/follow`, { method: on ? 'PUT' : 'DELETE' });
}

const backing = (handle: string, postId: string) =>
  `/api/spaces/${encodeURIComponent(handle)}/posts/${encodeURIComponent(postId)}/back`;

/** PUT /api/spaces/:handle/posts/:postId/back (the creator): badge + optional note. */
export function backProject(
  handle: string,
  postId: string,
  input: BackProjectInput = {},
): Promise<BackingState> {
  return apiFetch<BackingState>(backing(handle, postId), { method: 'PUT', json: input });
}

/** DELETE /api/spaces/:handle/posts/:postId/back (the creator). */
export function unbackProject(handle: string, postId: string): Promise<BackingState> {
  return apiFetch<BackingState>(backing(handle, postId), { method: 'DELETE' });
}
