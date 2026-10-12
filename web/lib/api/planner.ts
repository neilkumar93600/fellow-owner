import type {
  BestTimes,
  BestTimesInput,
  CaptionDraft,
  CaptionDraftInput,
  CreatePlanItemInput,
  MarkPlanItemInput,
  PlanItem,
  PlanRange,
  PlanRangeQuery,
  UpdatePlanItemInput,
} from '@fellow-owners/shared';
import { type Params, query } from '@/lib/api/studio';
import { apiFetch } from '@/lib/fetcher';

// Typed client for F3 Content planner: /api/spaces/:handle/planner/... (creator only).

const planner = (handle: string) => `/api/spaces/${encodeURIComponent(handle)}/planner`;
const item = (handle: string, id: string) => `${planner(handle)}/items/${encodeURIComponent(id)}`;

/** GET /planner?from=&to=&status= : items scheduled in [from, to) (at most 62 days), soonest first. */
export function getPlan(
  handle: string,
  params: Params<PlanRangeQuery>,
  signal?: AbortSignal,
): Promise<PlanRange> {
  return apiFetch<PlanRange>(`${planner(handle)}${query(params)}`, { signal });
}

/** GET /planner/items/:id */
export function getPlanItem(handle: string, id: string, signal?: AbortSignal): Promise<PlanItem> {
  return apiFetch<PlanItem>(item(handle, id), { signal });
}

/** POST /planner/items (201) */
export function createPlanItem(handle: string, input: CreatePlanItemInput): Promise<PlanItem> {
  return apiFetch<PlanItem>(`${planner(handle)}/items`, { method: 'POST', json: input });
}

/** PATCH /planner/items/:id : any field; null clears an optional one. */
export function updatePlanItem(
  handle: string,
  id: string,
  patch: UpdatePlanItemInput,
): Promise<PlanItem> {
  return apiFetch<PlanItem>(item(handle, id), { method: 'PATCH', json: patch });
}

/** DELETE /planner/items/:id (204) */
export function deletePlanItem(handle: string, id: string): Promise<void> {
  return apiFetch<void>(item(handle, id), { method: 'DELETE' });
}

/** POST /planner/items/:id/mark : posted, skipped, or planned to undo. */
export function markPlanItem(
  handle: string,
  id: string,
  input: MarkPlanItemInput,
): Promise<PlanItem> {
  return apiFetch<PlanItem>(`${item(handle, id)}/mark`, { method: 'POST', json: input });
}

/** POST /planner/best-times : upcoming good times from the creator's own posts (or labelled defaults). */
export function suggestBestTimes(handle: string, input: BestTimesInput = {}): Promise<BestTimes> {
  return apiFetch<BestTimes>(`${planner(handle)}/best-times`, { method: 'POST', json: input });
}

/** POST /planner/caption-draft : an AI draft to edit (capped per day; 429/503 when it cannot). */
export function draftCaption(handle: string, input: CaptionDraftInput): Promise<CaptionDraft> {
  return apiFetch<CaptionDraft>(`${planner(handle)}/caption-draft`, {
    method: 'POST',
    json: input,
  });
}
