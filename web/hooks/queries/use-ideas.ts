import type {
  CreateCommentInput,
  FeedbackVerdict,
  IdeasPage,
  PostType,
  StudioPostAction,
  StudioPostDetail,
} from '@fellow-owners/shared';
import { skipToken, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addComment } from '@/api/posts';
import { actOnPost, getIdeas, getStudioPost, sendFeedback } from '@/api/studio';
import { useCursorPages } from '@/hooks/use-cursor-list';
import { studioKeys } from '@/hooks/use-space';
import { shouldRetry } from '@/lib/query-client';
import { toastError } from '@/lib/toast';

/** 6 rows of the 3-column grid at 1280 (9 rows of 2 at 768). */
export const IDEAS_PAGE_SIZE = 18;

export interface IdeasFilters {
  /** Community slug. */
  community?: string | null;
  type?: PostType | null;
  q?: string | null;
}

interface IdeasListFilters {
  community?: string;
  type?: PostType;
  q?: string;
}

function listFilters({ community, type, q }: IdeasFilters): IdeasListFilters {
  return {
    community: community?.trim().toLowerCase() || undefined,
    type: type ?? undefined,
    q: q?.trim() || undefined,
  };
}

export const ideasKeys = {
  all: ['studio', 'ideas'] as const,
  list: (filters: IdeasFilters) => ['studio', 'ideas', 'list', listFilters(filters)] as const,
  top: (limit: number) => ['studio', 'ideas', 'top', limit] as const,
  /** StudioPostDetail, the post side panel (?item=). */
  post: (id: string) => ['studio', 'ideas', 'post', id] as const,
};

/**
 * Idea-ranked posts (hidden ones included, flagged), 18 a page with numbered pages (?page=, or
 * `urlParam` when a screen pages two lists). `total` follows every filter; `counts` feeds the
 * community chips (per type and q, whatever the community filter). The last page stays shown
 * while the next one loads.
 */
export function useIdeas(
  filters: IdeasFilters = {},
  { urlParam }: { urlParam?: string | null } = {},
) {
  const queryKey = ideasKeys.list(filters);
  const params = queryKey[3];
  const list = useCursorPages<IdeasPage>({
    queryKey,
    fetchPage: (cursor, signal) => getIdeas({ ...params, cursor, limit: IDEAS_PAGE_SIZE }, signal),
    pageSize: IDEAS_PAGE_SIZE,
    total: (page) => page.total,
    urlParam,
  });
  return {
    ...list,
    items: list.data?.items ?? [],
    counts: list.data?.counts ?? [],
    total: list.data?.total,
  };
}

/** Today's "Top ideas": the first `limit` ranked posts (hidden ones included, flagged). */
export function useTopIdeas(limit = 5) {
  return useQuery({
    queryKey: ideasKeys.top(limit),
    queryFn: ({ signal }) => getIdeas({ limit }, signal),
    select: (page) => page.items,
  });
}

/** The post side panel. While the AI reviews the post again (Rescore), it checks back. */
export function useStudioPost(id: string | null | undefined) {
  return useQuery({
    queryKey: ideasKeys.post(id ?? ''),
    queryFn: id ? ({ signal }) => getStudioPost(id, signal) : skipToken,
    refetchInterval: (query) => (query.state.data?.ai.status === 'pending' ? 5000 : false),
  });
}

export interface PostActionVars {
  id: string;
  action: StudioPostAction['action'];
}

/** Hide, unhide or rescore a post. Waits for the server, then refreshes every studio view. */
export function usePostAction() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: ({ id, action }: PostActionVars) => actOnPost(id, action),
    onSuccess: (post) => {
      queryClient.setQueryData(ideasKeys.post(post.id), post);
      // Hidden and score show in the ideas lists, Top ideas, community pages and the composer.
      queryClient.invalidateQueries({ queryKey: studioKeys.all });
    },
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

/** Thumbs on the AI read of a post; `verdict` null clears the vote. */
export function usePostFeedback(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (verdict: FeedbackVerdict | null) =>
      sendFeedback({ refType: 'post', refId: id, verdict }),
    onSuccess: ({ verdict }) => {
      queryClient.setQueryData<StudioPostDetail>(
        ideasKeys.post(id),
        (old) => old && { ...old, feedback: verdict },
      );
    },
    onError: (error) => toastError(error),
  });
}

/** The creator comments from the side panel; the thread and every comment count refresh. */
export function useStudioComment(id: string) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (input: CreateCommentInput) => addComment(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ideasKeys.post(id) });
      queryClient.invalidateQueries({ queryKey: ideasKeys.all });
    },
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
