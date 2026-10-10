import type {
  CreatePitchInput,
  CreatePostInput,
  FeedPage,
  FeedQuery,
  JoinResponse,
  JoinSpaceInput,
  MySpace,
  OwnMembership,
  Pitch,
  PostDetail,
  Showcase,
  SpacePage,
  SuggestCommunitiesInput,
  SuggestCommunitiesResponse,
  UpdateMembershipInput,
  ViewerMembership,
} from '@fellow-owners/shared';
import { apiFetch } from '@/lib/fetcher';

// Typed client for /api/spaces/:handle/*: the public bio page and showcase, then the member side.

function spacePath(handle: string): string {
  return `/api/spaces/${encodeURIComponent(handle)}`;
}

/** GET /api/spaces/:handle (public, cached 60s): profile, communities, featured projects. */
export function getSpacePage(handle: string, signal?: AbortSignal): Promise<SpacePage> {
  return apiFetch<SpacePage>(spacePath(handle), { signal });
}

/** GET /api/spaces/:handle/showcase/:slug (public). `live: false` once unpublished. */
export function getShowcase(handle: string, slug: string, signal?: AbortSignal): Promise<Showcase> {
  return apiFetch<Showcase>(`${spacePath(handle)}/showcase/${encodeURIComponent(slug)}`, {
    signal,
  });
}

/** GET /membership: who the viewer is here. Signed out answers 200 with `signedIn: false`. */
export function getMembership(handle: string, signal?: AbortSignal): Promise<ViewerMembership> {
  return apiFetch<ViewerMembership>(`${spacePath(handle)}/membership`, { signal });
}

/** POST /suggest-communities (join step 2): 10 an hour (429); `available: false` when the AI is down. */
export function suggestCommunities(
  handle: string,
  input: SuggestCommunitiesInput,
): Promise<SuggestCommunitiesResponse> {
  return apiFetch<SuggestCommunitiesResponse>(`${spacePath(handle)}/suggest-communities`, {
    method: 'POST',
    json: input,
  });
}

/** POST /join: creates the membership, or adds communities when the viewer is already a member. */
export function joinSpace(handle: string, input: JoinSpaceInput): Promise<JoinResponse> {
  return apiFetch<JoinResponse>(`${spacePath(handle)}/join`, { method: 'POST', json: input });
}

/** GET /me: My space (own posts, teams, pitches with replies, caps left today). Members only. */
export function getMe(handle: string, signal?: AbortSignal): Promise<MySpace> {
  return apiFetch<MySpace>(`${spacePath(handle)}/me`, { signal });
}

/** PATCH /me: own profile; `communityIds` replaces the joined set. */
export function updateMe(handle: string, input: UpdateMembershipInput): Promise<OwnMembership> {
  return apiFetch<OwnMembership>(`${spacePath(handle)}/me`, { method: 'PATCH', json: input });
}

/** GET /communities/:slug/posts: newest first. Signed-in non-members get `locked` with 3 preview titles. */
export function getFeed(
  handle: string,
  slug: string,
  { type, cursor, limit }: FeedQuery = {},
  signal?: AbortSignal,
): Promise<FeedPage> {
  const search = new URLSearchParams();
  if (type) search.set('type', type);
  if (cursor) search.set('cursor', cursor);
  if (limit) search.set('limit', String(limit));
  const query = search.toString();
  return apiFetch<FeedPage>(
    `${spacePath(handle)}/communities/${encodeURIComponent(slug)}/posts${query ? `?${query}` : ''}`,
    { signal },
  );
}

/** POST /posts (201): only in a joined community; 20 a day (429 daily_cap_reached). */
export function createPost(handle: string, input: CreatePostInput): Promise<PostDetail> {
  return apiFetch<PostDetail>(`${spacePath(handle)}/posts`, { method: 'POST', json: input });
}

/** POST /pitches (201): 5 a day per space; the first pitch creates a membership with no communities. */
export function createPitch(handle: string, input: CreatePitchInput): Promise<Pitch> {
  return apiFetch<Pitch>(`${spacePath(handle)}/pitches`, { method: 'POST', json: input });
}
