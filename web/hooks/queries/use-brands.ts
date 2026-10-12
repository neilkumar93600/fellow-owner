import type {
  BrandRequestsQuery,
  UpdateBrandRequestInput,
  WorkWithMeInput,
} from '@fellow-owners/shared';
import {
  keepPreviousData,
  skipToken,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { ensureStudioHandle, useStudioHandle } from '@/hooks/use-space';
import {
  disconnectInstagram,
  getBrandPick,
  getBrandRequest,
  getBrandRequests,
  getBrandSettings,
  rotateInboundAlias,
  startInstagramConnect,
  submitWorkWithMe,
  updateBrandRequest,
} from '@/lib/api/brands';
import type { Params } from '@/lib/api/studio';
import { toastError } from '@/lib/toast';

// F5 Brand inbox (creator) and the public work-with-me form. Creator keys sit under 'studio'.

export type BrandRequestFilters = Params<BrandRequestsQuery>;

export const brandKeys = {
  all: ['studio', 'brands'] as const,
  list: (filters: BrandRequestFilters) => ['studio', 'brands', 'list', filters] as const,
  detail: (id: string) => ['studio', 'brands', 'detail', id] as const,
  pick: ['studio', 'brands', 'pick'] as const,
  settings: ['studio', 'brands', 'settings'] as const,
};

/** The inbox, newest first (one page; `cursor` for the next), with counts per status. */
export function useBrandRequests(filters: BrandRequestFilters = {}) {
  const handle = useStudioHandle();
  return useQuery({
    queryKey: brandKeys.list(filters),
    queryFn: handle ? ({ signal }) => getBrandRequests(handle, filters, signal) : skipToken,
    placeholderData: keepPreviousData,
  });
}

/** One request (opening it marks it read); null id skips the read. */
export function useBrandRequest(id: string | null) {
  const handle = useStudioHandle();
  return useQuery({
    queryKey: brandKeys.detail(id ?? ''),
    queryFn: handle && id ? ({ signal }) => getBrandRequest(handle, id, signal) : skipToken,
  });
}

/** Today's "Don't miss" pick. */
export function useBrandPick() {
  const handle = useStudioHandle();
  return useQuery({
    queryKey: brandKeys.pick,
    queryFn: handle ? ({ signal }) => getBrandPick(handle, signal) : skipToken,
  });
}

/** Forwarding address, Instagram connection and media kit settings (Settings, Brand deals tab). */
export function useBrandSettings() {
  const handle = useStudioHandle();
  return useQuery({
    queryKey: brandKeys.settings,
    queryFn: handle ? ({ signal }) => getBrandSettings(handle, signal) : skipToken,
  });
}

/** A brand-inbox write: resolves the handle, refreshes every brand query, toasts errors. */
function useBrandMutation<V, R>(mutationFn: (handle: string, vars: V) => Promise<R>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: V) => mutationFn(await ensureStudioHandle(queryClient), vars),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: brandKeys.all }),
    onError: (error) => toastError(error),
  });
}

/** Move a request: shortlisted, replied, accepted, declined, archived, spam or back to new. */
export function useUpdateBrandRequest() {
  return useBrandMutation((handle, { id, input }: { id: string; input: UpdateBrandRequestInput }) =>
    updateBrandRequest(handle, id, input),
  );
}

/** A brand-settings action without input (`mutate()`), with the same refresh and toast. */
function useBrandAction<R>(action: (handle: string) => Promise<R>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => action(await ensureStudioHandle(queryClient)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: brandKeys.all }),
    onError: (error) => toastError(error),
  });
}

/** A new forwarding address (the old one stops working). */
export function useRotateInboundAlias() {
  return useBrandAction(rotateInboundAlias);
}

/** Starts Meta's consent flow: resolves with the URL to send the browser to. */
export function useInstagramConnect() {
  return useBrandAction(startInstagramConnect);
}

export function useDisconnectInstagram() {
  return useBrandAction(disconnectInstagram);
}

/** The public form on /{handle}/work-with-me; the form shows 400 field errors and 429 itself. */
export function useSubmitWorkWithMe(handle: string) {
  return useMutation({ mutationFn: (input: WorkWithMeInput) => submitWorkWithMe(handle, input) });
}
