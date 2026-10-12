import type {
  BrandPick,
  BrandRequest,
  BrandRequestDetail,
  BrandRequestsPage,
  BrandRequestsQuery,
  BrandSettings,
  InstagramConnectStart,
  UpdateBrandRequestInput,
  WorkWithMeInput,
  WorkWithMeReceipt,
} from '@fellow-owners/shared';
import { type Params, query } from '@/lib/api/studio';
import { apiFetch } from '@/lib/fetcher';

// Typed client for F5 Brand inbox: the public work-with-me form, and the creator's inbox, daily
// pick and settings under /api/spaces/:handle/... (creator only).

const space = (handle: string) => `/api/spaces/${encodeURIComponent(handle)}`;
const request = (handle: string, id: string) =>
  `${space(handle)}/brand-requests/${encodeURIComponent(id)}`;

/** POST /work-with-me (public, 201): 400 with field details, 429 past the limits. */
export function submitWorkWithMe(
  handle: string,
  input: WorkWithMeInput,
): Promise<WorkWithMeReceipt> {
  return apiFetch<WorkWithMeReceipt>(`${space(handle)}/work-with-me`, {
    method: 'POST',
    json: input,
  });
}

/** GET /brand-requests?status=&source=&q=&cursor=&limit= : newest first, with counts. */
export function getBrandRequests(
  handle: string,
  params: Params<BrandRequestsQuery> = {},
  signal?: AbortSignal,
): Promise<BrandRequestsPage> {
  return apiFetch<BrandRequestsPage>(`${space(handle)}/brand-requests${query(params)}`, {
    signal,
  });
}

/** GET /brand-requests/:id : the full request (marks it read). */
export function getBrandRequest(
  handle: string,
  id: string,
  signal?: AbortSignal,
): Promise<BrandRequestDetail> {
  return apiFetch<BrandRequestDetail>(request(handle, id), { signal });
}

/** PATCH /brand-requests/:id { status } */
export function updateBrandRequest(
  handle: string,
  id: string,
  input: UpdateBrandRequestInput,
): Promise<BrandRequest> {
  return apiFetch<BrandRequest>(request(handle, id), { method: 'PATCH', json: input });
}

/** GET /brand-pick : Today's "Don't miss" (request null when nothing stands out). */
export function getBrandPick(handle: string, signal?: AbortSignal): Promise<BrandPick> {
  return apiFetch<BrandPick>(`${space(handle)}/brand-pick`, { signal });
}

/** GET /brand-settings : forwarding address, Instagram connection, media kit settings. */
export function getBrandSettings(handle: string, signal?: AbortSignal): Promise<BrandSettings> {
  return apiFetch<BrandSettings>(`${space(handle)}/brand-settings`, { signal });
}

/** POST /brand-settings/alias : a new forwarding address (the old one stops working). */
export function rotateInboundAlias(handle: string): Promise<BrandSettings> {
  return apiFetch<BrandSettings>(`${space(handle)}/brand-settings/alias`, { method: 'POST' });
}

/** POST /instagram/connect : where to send the browser (503 feature_disabled without Meta keys). */
export function startInstagramConnect(handle: string): Promise<InstagramConnectStart> {
  return apiFetch<InstagramConnectStart>(`${space(handle)}/instagram/connect`, {
    method: 'POST',
  });
}

/** DELETE /instagram (204) */
export function disconnectInstagram(handle: string): Promise<void> {
  return apiFetch<void>(`${space(handle)}/instagram`, { method: 'DELETE' });
}
