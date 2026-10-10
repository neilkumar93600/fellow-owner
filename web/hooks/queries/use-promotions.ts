import {
  PROMOTION_STATES,
  type Promotion,
  type PromotionAction,
  type PromotionComposer,
  type PromotionsPage,
} from '@fellow-owners/shared';
import {
  type QueryClient,
  skipToken,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { actOnPromotion, createPromotion, getPromotionComposer, getPromotions } from '@/api/studio';
import { useCursorPages } from '@/hooks/use-cursor-list';
import { studioKeys } from '@/hooks/use-space';
import { shouldRetry } from '@/lib/query-client';
import { toastError } from '@/lib/toast';

export const PROMOTIONS_PAGE_SIZE = 20;

export const promotionKeys = {
  all: ['studio', 'promotions'] as const,
  list: ['studio', 'promotions', 'list'] as const,
  composer: (postId: string) => ['studio', 'promotions', 'composer', postId] as const,
};

export interface PromotionActionVars {
  id: string;
  /** save (headline, drafts), publish, unpublish, regenerate (some platforms, or all). */
  action: PromotionAction;
}

const countAll = (page: PromotionsPage) =>
  PROMOTION_STATES.reduce((sum, state) => sum + page.counts[state], 0);

/**
 * Every promotion (all states), newest first, 20 a page with numbered pages (?page=), with the
 * counts per state and the clicks across all of them. The last page stays shown while the next
 * one loads.
 */
export function usePromotions({ urlParam }: { urlParam?: string | null } = {}) {
  const list = useCursorPages<PromotionsPage>({
    queryKey: promotionKeys.list,
    fetchPage: (cursor, signal) => getPromotions({ cursor, limit: PROMOTIONS_PAGE_SIZE }, signal),
    pageSize: PROMOTIONS_PAGE_SIZE,
    total: countAll,
    urlParam,
  });
  const data = list.data;
  return {
    ...list,
    items: data?.items ?? [],
    counts: data?.counts,
    totalClicks: data?.totalClicks,
    total: data && countAll(data),
  };
}

/** The composer bootstrap: the post (studio view) and its promotion, null before Promote. */
export function usePromotionComposer(postId: string | null | undefined) {
  return useQuery({
    queryKey: promotionKeys.composer(postId ?? ''),
    queryFn: postId ? ({ signal }) => getPromotionComposer(postId, signal) : skipToken,
  });
}

/**
 * Promote: creates the promotion and drafts every platform with the AI (a few seconds; failed
 * platforms come back in draftErrors). For a post already promoted it returns that promotion.
 */
export function useCreatePromotion() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (postId: string) => createPromotion({ postId }),
    onSuccess: (promotion) => settle(queryClient, promotion),
    onError: (error, postId) => {
      toastError(error, {
        retry: shouldRetry(0, error)
          ? () => {
              mutation.mutate(postId);
            }
          : undefined,
      });
    },
  });
  return mutation;
}

/** Save drafts, publish, unpublish or regenerate. Waits for the server (spinner), then settles. */
export function usePromotionAction() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: ({ id, action }: PromotionActionVars) => actOnPromotion(id, action),
    onSuccess: (promotion) => settle(queryClient, promotion),
    onError: (error, vars) => {
      toastError(error, {
        retry: shouldRetry(0, error)
          ? () => {
              mutation.mutate(vars);
            }
          : undefined,
      });
    },
  });
  return mutation;
}

/**
 * Puts the server's promotion into its composer at once, then refreshes every studio view: the
 * list, and the idea cards and post panel that show the promotion state and Featured.
 */
function settle(queryClient: QueryClient, promotion: Promotion) {
  queryClient.setQueryData<PromotionComposer>(
    promotionKeys.composer(promotion.postId),
    (composer) =>
      composer && {
        ...composer,
        promotion,
        post: {
          ...composer.post,
          promotion: { id: promotion.id, state: promotion.state },
          featured: promotion.state === 'live',
        },
      },
  );
  queryClient.invalidateQueries({ queryKey: studioKeys.all });
}
