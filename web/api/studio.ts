import type {
  AiFeedbackInput,
  Briefing,
  CreateCommunityInput,
  CreatePromotionInput,
  CreateSpaceInput,
  FeedbackResponse,
  HandleCheck,
  IdeasPage,
  IdeasQuery,
  InboxDetail,
  InboxPage,
  InboxQuery,
  Overview,
  PeoplePage,
  PeopleQuery,
  PersonRow,
  Promotion,
  PromotionAction,
  PromotionComposer,
  PromotionState,
  PromotionsPage,
  SetPersonCommunitiesInput,
  StudioCommunity,
  StudioCommunityDetail,
  StudioPitchAction,
  StudioPostAction,
  StudioPostDetail,
  StudioSpace,
  SweepResponse,
  UpdateCommunityInput,
  UpdateSettingsInput,
} from '@fellow-owners/shared';
import { apiFetch } from '@/lib/fetcher';

// Typed client for everything under /api/studio (creator only). Every read takes an optional
// AbortSignal; list reads take their filters plus `cursor` (null on page 1) and `limit` (1..50).

/** Query params as the client sends them: all optional, and null or '' means "not set". */
export type Params<Q> = { [K in keyof Q]?: Q[K] | null };

export type CursorParams = Params<{ cursor: string; limit: number }>;
export type InboxParams = Params<InboxQuery>;
export type IdeasParams = Params<IdeasQuery>;
export type PeopleParams = Params<PeopleQuery>;

/** `?a=1&b=x` from the values that are set; blank strings are left out, others trimmed. */
export function query(params: Record<string, string | number | null | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    const text = typeof value === 'string' ? value.trim() : value;
    if (text !== undefined && text !== null && text !== '') search.set(key, String(text));
  }
  const text = search.toString();
  return text ? `?${text}` : '';
}

const at = (segment: string) => encodeURIComponent(segment);

// ---------------------------------------------------------------- space, onboarding, settings

/** GET /handle-check?handle= : availability plus up to 3 suggestions. */
export function checkHandle(handle: string, signal?: AbortSignal): Promise<HandleCheck> {
  return apiFetch<HandleCheck>(`/api/studio/handle-check?handle=${at(handle)}`, { signal });
}

/** POST /space : finish onboarding; creates the space and the owner membership. */
export function createSpace(input: CreateSpaceInput): Promise<StudioSpace> {
  return apiFetch<StudioSpace>('/api/studio/space', { method: 'POST', json: input });
}

/** GET /space : the creator's own space (404 when the user has none yet). */
export function getMySpace(signal?: AbortSignal): Promise<StudioSpace> {
  return apiFetch<StudioSpace>('/api/studio/space', { signal });
}

/** PUT /settings : profile and/or taste profile; a taste profile bumps tasteVersion. */
export function updateSettings(input: UpdateSettingsInput): Promise<StudioSpace> {
  return apiFetch<StudioSpace>('/api/studio/settings', { method: 'PUT', json: input });
}

// ---------------------------------------------------------------- today

export function getOverview(signal?: AbortSignal): Promise<Overview> {
  return apiFetch<Overview>('/api/studio/overview', { signal });
}

/** POST /sweep : claims up to 25 pending items; the analysis itself runs in the background. */
export function sweep(): Promise<SweepResponse> {
  return apiFetch<SweepResponse>('/api/studio/sweep', { method: 'POST' });
}

export function getBriefing(signal?: AbortSignal): Promise<Briefing> {
  return apiFetch<Briefing>('/api/studio/briefing', { signal });
}

/** POST /briefing/regenerate : 5 a day, then 429 daily_cap_reached. */
export function regenerateBriefing(): Promise<Briefing> {
  return apiFetch<Briefing>('/api/studio/briefing/regenerate', { method: 'POST' });
}

/** POST /feedback : thumbs on an AI pick; verdict null clears the vote. */
export function sendFeedback(input: AiFeedbackInput): Promise<FeedbackResponse> {
  return apiFetch<FeedbackResponse>('/api/studio/feedback', { method: 'POST', json: input });
}

// ---------------------------------------------------------------- inbox

/** GET /inbox : one tab, Fit or Newest; counts per tab follow the status and q filters. */
export function getInbox(params: InboxParams = {}, signal?: AbortSignal): Promise<InboxPage> {
  return apiFetch<InboxPage>(`/api/studio/inbox${query(params)}`, { signal });
}

export function getInboxItem(id: string, signal?: AbortSignal): Promise<InboxDetail> {
  return apiFetch<InboxDetail>(`/api/studio/inbox/${at(id)}`, { signal });
}

/** PATCH /inbox/:id : set_status, restore, reply or rescore; answers the updated detail. */
export function actOnInboxItem(id: string, action: StudioPitchAction): Promise<InboxDetail> {
  return apiFetch<InboxDetail>(`/api/studio/inbox/${at(id)}`, { method: 'PATCH', json: action });
}

// ---------------------------------------------------------------- ideas and posts

/** GET /ideas : idea-ranked posts (hidden included); total follows every filter. */
export function getIdeas(params: IdeasParams = {}, signal?: AbortSignal): Promise<IdeasPage> {
  return apiFetch<IdeasPage>(`/api/studio/ideas${query(params)}`, { signal });
}

export function getStudioPost(id: string, signal?: AbortSignal): Promise<StudioPostDetail> {
  return apiFetch<StudioPostDetail>(`/api/studio/posts/${at(id)}`, { signal });
}

export function actOnPost(
  id: string,
  action: StudioPostAction['action'],
): Promise<StudioPostDetail> {
  return apiFetch<StudioPostDetail>(`/api/studio/posts/${at(id)}`, {
    method: 'PATCH',
    json: { action },
  });
}

// ---------------------------------------------------------------- people

/** GET /people : members ranked by contributions, plus the rising strip on every page. */
export function getPeople(params: PeopleParams = {}, signal?: AbortSignal): Promise<PeoplePage> {
  return apiFetch<PeoplePage>(`/api/studio/people${query(params)}`, { signal });
}

/** DELETE /people/:membershipId : 204; the owner can't be removed (403). */
export function removePerson(membershipId: string): Promise<void> {
  return apiFetch<void>(`/api/studio/people/${at(membershipId)}`, { method: 'DELETE' });
}

/** PUT /people/:membershipId/communities : moves a member; answers the updated row. */
export function setPersonCommunities(
  membershipId: string,
  input: SetPersonCommunitiesInput,
): Promise<PersonRow> {
  return apiFetch<PersonRow>(`/api/studio/people/${at(membershipId)}/communities`, {
    method: 'PUT',
    json: input,
  });
}

// ---------------------------------------------------------------- communities

/** GET /communities : archived ones included, flagged by archivedAt. */
export function getCommunities(signal?: AbortSignal): Promise<StudioCommunity[]> {
  return apiFetch<StudioCommunity[]>('/api/studio/communities', { signal });
}

/** POST /communities : 409 when the slug exists or the space has 20 already. */
export function createCommunity(input: CreateCommunityInput): Promise<StudioCommunity> {
  return apiFetch<StudioCommunity>('/api/studio/communities', { method: 'POST', json: input });
}

/**
 * GET /communities/:slug : stats plus one page of members and posts. The API pages both with one
 * offset cursor but returns no nextCursor, so page past the first with getPeople and getIdeas
 * filtered by `community` (same order, real cursors and totals).
 */
export function getCommunity(
  slug: string,
  params: CursorParams = {},
  signal?: AbortSignal,
): Promise<StudioCommunityDetail> {
  return apiFetch<StudioCommunityDetail>(`/api/studio/communities/${at(slug)}${query(params)}`, {
    signal,
  });
}

/** PATCH /communities/:id : rename, describe, restyle, reorder; archived true or false. */
export function updateCommunity(id: string, patch: UpdateCommunityInput): Promise<StudioCommunity> {
  return apiFetch<StudioCommunity>(`/api/studio/communities/${at(id)}`, {
    method: 'PATCH',
    json: patch,
  });
}

// ---------------------------------------------------------------- promotions

/** GET /promotions : newest first, every state; counts per state and total clicks. */
export function getPromotions(
  params: CursorParams & Params<{ state: PromotionState }> = {},
  signal?: AbortSignal,
): Promise<PromotionsPage> {
  return apiFetch<PromotionsPage>(`/api/studio/promotions${query(params)}`, { signal });
}

/** GET /promotions/post/:postId : the post (studio view) and its promotion, null before Promote. */
export function getPromotionComposer(
  postId: string,
  signal?: AbortSignal,
): Promise<PromotionComposer> {
  return apiFetch<PromotionComposer>(`/api/studio/promotions/post/${at(postId)}`, { signal });
}

/** POST /promotions : drafts the posts with the AI (201), or returns the existing one (200). */
export function createPromotion(input: CreatePromotionInput): Promise<Promotion> {
  return apiFetch<Promotion>('/api/studio/promotions', { method: 'POST', json: input });
}

/** PATCH /promotions/:id : save, publish, unpublish or regenerate. */
export function actOnPromotion(id: string, action: PromotionAction): Promise<Promotion> {
  return apiFetch<Promotion>(`/api/studio/promotions/${at(id)}`, {
    method: 'PATCH',
    json: action,
  });
}
