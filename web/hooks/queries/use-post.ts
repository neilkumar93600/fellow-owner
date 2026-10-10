import type {
  CommentItem,
  CreateCommentInput,
  CreatePostInput,
  FeedPage,
  MySpace,
  PostCard,
  PostDetail,
  SignalKind,
  SignalState,
  TeamDecisionInput,
  TeamRequestInput,
  UpdatePostInput,
  ViewerMembership,
} from '@fellow-owners/shared';
import {
  type InfiniteData,
  type QueryClient,
  type QueryKey,
  type UseMutationResult,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { feedKeys } from '@/hooks/queries/use-feed';
import { meKeys } from '@/hooks/queries/use-me';
import { membershipKeys } from '@/hooks/use-membership';
import {
  addComment,
  addSignal,
  decideTeamRole,
  deleteComment,
  deletePost,
  getPost,
  removeSignal,
  requestTeamRole,
  updatePost,
} from '@/lib/api/posts';
import { createPost } from '@/lib/api/spaces';
import { ApiError } from '@/lib/fetcher';
import { toastError } from '@/lib/toast';

export const postKeys = {
  all: ['post'] as const,
  detail: (id: string) => [...postKeys.all, id] as const,
};

// ------------------------------------------------------------ cache plumbing
// A post lives in up to three places: its detail, feed pages (InfiniteData<FeedPage>) and My space
// (posts and teams). Writes keep every copy in step so no screen shows an old count.

type CardPatch = (card: PostCard) => Partial<PostCard> | null;

/** Patches the post wherever a feed page or My space lists it; a `null` patch drops it from the lists. */
function patchListedPost(queryClient: QueryClient, postId: string, patch: CardPatch): void {
  const next = (card: PostCard): PostCard | null => {
    if (card.id !== postId) return card;
    const change = patch(card);
    return change && { ...card, ...change };
  };
  queryClient.setQueriesData<InfiniteData<FeedPage>>(
    { queryKey: feedKeys.all },
    (old) =>
      old?.pages && {
        ...old,
        pages: old.pages.map((page) => ({
          ...page,
          items: page.items.flatMap((card) => next(card) ?? []),
        })),
      },
  );
  queryClient.setQueriesData<MySpace>(
    { queryKey: meKeys.all },
    (old) =>
      old && {
        ...old,
        posts: old.posts.flatMap((card) => next(card) ?? []),
        teams: old.teams.flatMap((team) => {
          const post = next(team.post);
          return post ? [{ ...team, post }] : [];
        }),
      },
  );
}

/** Patches the detail first, then every listed copy. */
function patchPost(
  queryClient: QueryClient,
  postId: string,
  patch: (card: PostCard) => Partial<PostCard>,
): void {
  queryClient.setQueryData<PostDetail>(
    postKeys.detail(postId),
    (old) => old && { ...old, ...patch(old) },
  );
  patchListedPost(queryClient, postId, patch);
}

/** A fresh PostDetail from the API replaces the detail and refreshes the listed copies. */
function storePost(queryClient: QueryClient, post: PostDetail): void {
  queryClient.setQueryData(postKeys.detail(post.id), post);
  patchListedPost(queryClient, post.id, () => post);
}

/** Stops refetches that could land older data over an optimistic change. First loads keep going. */
async function cancelRefetches(queryClient: QueryClient, queryKeys: QueryKey[]): Promise<void> {
  await Promise.all(
    queryKeys.map((queryKey) =>
      queryClient.cancelQueries({ queryKey, predicate: (query) => query.state.data !== undefined }),
    ),
  );
}

/** Retry only helps when the request never got an answer or the server failed. */
function retryable(error: unknown, retry: () => void): (() => void) | undefined {
  const final = error instanceof ApiError && error.status > 0 && error.status < 500;
  return final ? undefined : retry;
}

// ------------------------------------------------------------ reads

/** GET /api/posts/:id: body, roles, team, comments and the viewer's signals. Members only (403). */
export function usePost(id: string) {
  return useQuery({
    queryKey: postKeys.detail(id),
    queryFn: ({ signal }) => getPost(id, signal),
  });
}

// ------------------------------------------------------------ post writes

/**
 * Publishes a post. On success it is cached as a detail and shown at the top of the community's
 * cached feeds (its type tab and the all-types list), counted in every tab. Failures toast; the form
 * keeps its values.
 */
export function useCreatePost(handle: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePostInput) => createPost(handle, input),
    onSuccess: (post) => {
      queryClient.setQueryData(postKeys.detail(post.id), post);
      const feeds = queryClient.getQueriesData<InfiniteData<FeedPage>>({
        queryKey: feedKeys.community(handle, post.community.slug),
      });
      for (const [queryKey, data] of feeds) {
        const [first, ...rest] = data?.pages ?? [];
        if (!data || !first || first.items.some((item) => item.id === post.id)) continue;
        const tab = queryKey[3];
        const items = tab === 'all' || tab === post.type ? [post, ...first.items] : first.items;
        const counts = { ...first.counts, [post.type]: first.counts[post.type] + 1 };
        queryClient.setQueryData<InfiniteData<FeedPage>>(queryKey, {
          ...data,
          pages: [{ ...first, items, counts }, ...rest],
        });
      }
      void queryClient.invalidateQueries({ queryKey: meKeys.detail(handle) });
    },
    onError: (error) => toastError(error),
  });
}

/** Author edits: content within 24 hours, status any time. Every cached copy updates. Failures toast. */
export function useUpdatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ postId, ...input }: { postId: string } & UpdatePostInput) =>
      updatePost(postId, input),
    onSuccess: (post) => storePost(queryClient, post),
    onError: (error) => toastError(error),
  });
}

/**
 * Author deletes. The post leaves every cached list at once and feeds refetch for their counts. The
 * detail entry is left to expire, so an open post page does not refetch into a 404 while it navigates
 * away. Failures toast.
 */
export function useDeletePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (postId: string) => deletePost(postId),
    onSuccess: (_, postId) => {
      patchListedPost(queryClient, postId, () => null);
      void queryClient.invalidateQueries({ queryKey: feedKeys.all });
      void queryClient.invalidateQueries({ queryKey: meKeys.all });
    },
    onError: (error) => toastError(error),
  });
}

// ------------------------------------------------------------ signals

export interface SignalToggle {
  postId: string;
  kind: SignalKind;
  /** true adds the signal, false removes it. */
  on: boolean;
}

interface SignalContext {
  /** The post's signal state before this toggle, from the freshest cached copy. */
  previous?: SignalState;
}

// Taps run one request at a time, in order, so a quick double tap can never land out of order.
const SIGNALS = 'post-signals';

function toggled(card: PostCard, kind: SignalKind, on: boolean): SignalState {
  const { useCount, buildCount, viewerSignals } = card;
  if (viewerSignals.includes(kind) === on) return { useCount, buildCount, viewerSignals };
  const delta = on ? 1 : -1;
  return {
    useCount: kind === 'use' ? Math.max(0, useCount + delta) : useCount,
    buildCount: kind === 'build' ? Math.max(0, buildCount + delta) : buildCount,
    viewerSignals: on ? [...viewerSignals, kind] : viewerSignals.filter((k) => k !== kind),
  };
}

/**
 * "I'd use this" / "I'd help build". Optimistic on the detail, feed pages and My space; on error every
 * copy reverts and a toast offers Retry. Never offer it on the viewer's own post (`isAuthor`, 403).
 * Call: `mutate({ postId, kind, on: !card.viewerSignals.includes(kind) })`.
 */
export function useSignal() {
  const queryClient = useQueryClient();
  const signal: UseMutationResult<SignalState, unknown, SignalToggle, SignalContext> = useMutation({
    mutationKey: [SIGNALS],
    scope: { id: SIGNALS },
    mutationFn: ({ postId, kind, on }: SignalToggle) =>
      on ? addSignal(postId, kind) : removeSignal(postId, kind),
    onMutate: async ({ postId, kind, on }) => {
      await cancelRefetches(queryClient, [postKeys.detail(postId), feedKeys.all, meKeys.all]);
      const context: SignalContext = {};
      // patchPost visits the detail first, so `previous` is the freshest copy.
      patchPost(queryClient, postId, (card) => {
        const { useCount, buildCount, viewerSignals } = card;
        context.previous ??= { useCount, buildCount, viewerSignals };
        return toggled(card, kind, on);
      });
      return context;
    },
    onSuccess: (state, { postId }) => {
      // A later tap is still queued; its own answer lands next, so skip this one (no flicker).
      if (queryClient.isMutating({ mutationKey: [SIGNALS] }) > 1) return;
      patchPost(queryClient, postId, () => state);
    },
    onError: (error, toggle, context) => {
      const previous = context?.previous;
      if (previous) patchPost(queryClient, toggle.postId, () => previous);
      toastError(error, { retry: retryable(error, () => signal.mutate(toggle)) });
    },
  });
  return signal;
}

// ------------------------------------------------------------ comments

export type NewComment = { postId: string } & CreateCommentInput;

const PENDING_PREFIX = 'pending-';
let pendingSeq = 0;

/** A comment still being sent (optimistic): render it muted and without a delete action. */
export function isPendingComment(comment: CommentItem): boolean {
  return comment.id.startsWith(PENDING_PREFIX);
}

/**
 * Sends a comment, shown at once at the end of the thread under the viewer's name (read from
 * useMembership(handle)'s cache). On error it is removed and a toast offers Retry.
 */
export function useAddComment(handle: string) {
  const queryClient = useQueryClient();
  const add: UseMutationResult<CommentItem, unknown, NewComment, { pendingId: string }> =
    useMutation({
      mutationFn: ({ postId, ...input }: NewComment) => addComment(postId, input),
      onMutate: async ({ postId, body }) => {
        await cancelRefetches(queryClient, [postKeys.detail(postId)]);
        const own = queryClient.getQueryData<ViewerMembership>(
          membershipKeys.detail(handle),
        )?.membership;
        pendingSeq += 1;
        const pending: CommentItem = {
          id: `${PENDING_PREFIX}${pendingSeq}`,
          body: body.trim(),
          author: {
            membershipId: own?.id ?? null,
            name: own?.name ?? 'You',
            headline: own?.headline ?? null,
            image: null,
          },
          createdAt: new Date().toISOString(),
          isOwn: true,
        };
        queryClient.setQueryData<PostDetail>(
          postKeys.detail(postId),
          (old) =>
            old && {
              ...old,
              comments: [...old.comments, pending],
              commentCount: old.commentCount + 1,
            },
        );
        return { pendingId: pending.id };
      },
      onSuccess: (comment, { postId }, { pendingId }) => {
        queryClient.setQueryData<PostDetail>(
          postKeys.detail(postId),
          (old) =>
            old && {
              ...old,
              comments: [
                ...old.comments.filter((item) => item.id !== pendingId && item.id !== comment.id),
                comment,
              ],
            },
        );
        patchListedPost(queryClient, postId, (card) => ({ commentCount: card.commentCount + 1 }));
      },
      onError: (error, draft, context) => {
        if (context) {
          queryClient.setQueryData<PostDetail>(
            postKeys.detail(draft.postId),
            (old) =>
              old && {
                ...old,
                comments: old.comments.filter((item) => item.id !== context.pendingId),
                commentCount: Math.max(0, old.commentCount - 1),
              },
          );
        }
        toastError(error, { retry: retryable(error, () => add.mutate(draft)) });
      },
    });
  return add;
}

/** The comment's author deletes it; the thread and every count update. Failures toast. */
export function useDeleteComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ postId, commentId }: { postId: string; commentId: string }) =>
      deleteComment(postId, commentId),
    onSuccess: (_, { postId, commentId }) => {
      queryClient.setQueryData<PostDetail>(
        postKeys.detail(postId),
        (old) =>
          old && {
            ...old,
            comments: old.comments.filter((item) => item.id !== commentId),
            commentCount: Math.max(0, old.commentCount - 1),
          },
      );
      patchListedPost(queryClient, postId, (card) => ({
        commentCount: Math.max(0, card.commentCount - 1),
      }));
    },
    onError: (error) => toastError(error),
  });
}

// ------------------------------------------------------------ teams

/** "Join as {role}" on a project: the viewer's request shows as Requested. Failures toast. */
export function useRequestTeamRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ postId, ...input }: { postId: string } & TeamRequestInput) =>
      requestTeamRole(postId, input),
    onSuccess: (post) => {
      storePost(queryClient, post);
      // My teams gains the request.
      void queryClient.invalidateQueries({ queryKey: meKeys.all });
    },
    onError: (error) => toastError(error),
  });
}

/** The project author accepts or declines a request; the team and open roles update. Failures toast. */
export function useDecideTeamRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      postId,
      membershipId,
      ...input
    }: { postId: string; membershipId: string } & TeamDecisionInput) =>
      decideTeamRole(postId, membershipId, input),
    onSuccess: (post) => storePost(queryClient, post),
    onError: (error) => toastError(error),
  });
}
