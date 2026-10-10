import type {
  AutoTagFollowersInput,
  AutoTagResult,
  CreateFollowerInput,
  Follower,
  FollowersPage,
  FollowersQuery,
  ImportFollowersInput,
  ImportResult,
  TagFollowersInput,
  TagFollowersResult,
  UpdateFollowerInput,
  YoutubeImportInput,
} from '@fellow-owners/shared';
import { type Params, query } from '@/api/studio';
import { apiFetch } from '@/lib/fetcher';

// Typed client for /api/studio/followers (creator only): the follower roster (F23).

export type FollowersParams = Params<FollowersQuery>;

const at = (segment: string) => encodeURIComponent(segment);

/** GET / : newest first; `community` is a slug or `untagged`, `joined` is yes or no. */
export function getFollowers(
  params: FollowersParams = {},
  signal?: AbortSignal,
): Promise<FollowersPage> {
  return apiFetch<FollowersPage>(`/api/studio/followers${query(params)}`, { signal });
}

/** POST / : add one by hand (201); 409 when the email or platform + handle is already listed. */
export function createFollower(input: CreateFollowerInput): Promise<Follower> {
  return apiFetch<Follower>('/api/studio/followers', { method: 'POST', json: input });
}

/** PATCH /:id : null clears a field; `communityIds` replaces the tags. */
export function updateFollower(id: string, patch: UpdateFollowerInput): Promise<Follower> {
  return apiFetch<Follower>(`/api/studio/followers/${at(id)}`, { method: 'PATCH', json: patch });
}

/** DELETE /:id : 204. */
export function deleteFollower(id: string): Promise<void> {
  return apiFetch<void>(`/api/studio/followers/${at(id)}`, { method: 'DELETE' });
}

/** POST /import : CSV or pasted lines (201) with AI-proposed communities unless suggest is false. */
export function importFollowers(input: ImportFollowersInput): Promise<ImportResult> {
  return apiFetch<ImportResult>('/api/studio/followers/import', { method: 'POST', json: input });
}

/** POST /import/youtube result: `sample` is true when the server has no YouTube key (made-up commenters). */
export type YoutubeImportResult = Omit<ImportResult, 'source'> & {
  source: 'youtube';
  sample: boolean;
};

/** POST /import/youtube : commenters on a channel's latest videos (201); 404 unknown channel, 502 YouTube down. */
export function importYoutube(input: YoutubeImportInput): Promise<YoutubeImportResult> {
  return apiFetch<YoutubeImportResult>('/api/studio/followers/import/youtube', {
    method: 'POST',
    json: input,
  });
}

/** POST /tag : add or remove one community on up to 500 followers. */
export function tagFollowers(input: TagFollowersInput): Promise<TagFollowersResult> {
  return apiFetch<TagFollowersResult>('/api/studio/followers/tag', {
    method: 'POST',
    json: input,
  });
}

/** POST /auto-tag : the AI tags from notes; no ids = every untagged follower. */
export function autoTagFollowers(input: AutoTagFollowersInput = {}): Promise<AutoTagResult> {
  return apiFetch<AutoTagResult>('/api/studio/followers/auto-tag', {
    method: 'POST',
    json: input,
  });
}
