import type {
  AnswerQuestionGroupInput,
  QuestionGroup,
  QuestionGroupsPage,
} from '@fellow-owners/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  answerQuestionGroup,
  dismissQuestionGroup,
  listQuestionGroups,
  redraftQuestionGroup,
  removeQuestionGroupAsker,
} from '@/lib/api/question-groups';
import { shouldRetry } from '@/lib/query-client';
import { toastError } from '@/lib/toast';
import { inboxKeys } from './use-inbox';

export const questionGroupKeys = {
  all: ['studio', 'question-groups'] as const,
};

/** "What fans want" (F32 Answer Once): open groups first, then answered ones. */
export function useQuestionGroups() {
  return useQuery({
    queryKey: questionGroupKeys.all,
    queryFn: ({ signal }) => listQuestionGroups(signal),
  });
}

type Patch = (group: QuestionGroup) => QuestionGroup;

/**
 * A group action, optimistic: `patch` applies to the cached list at once, the server's group
 * replaces it on success, and a failure restores the list and toasts (with Retry when worth it).
 */
function useGroupMutation<V extends { group: QuestionGroup }>(
  run: (vars: V) => Promise<QuestionGroup>,
  patch: (vars: V) => Patch,
) {
  const queryClient = useQueryClient();
  const key = questionGroupKeys.all;
  const setGroup = (id: string, change: Patch) =>
    queryClient.setQueryData<QuestionGroupsPage>(
      key,
      (page) =>
        page && { items: page.items.map((group) => (group.id === id ? change(group) : group)) },
    );

  const mutation = useMutation({
    mutationFn: run,
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<QuestionGroupsPage>(key);
      setGroup(vars.group.id, patch(vars));
      return { previous };
    },
    onSuccess: (group) => setGroup(group.id, () => group),
    onError: (error, vars, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
      toastError(error, {
        retry: shouldRetry(0, error) ? () => mutation.mutate(vars) : undefined,
      });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });
  return mutation;
}

export interface AnswerVars {
  group: QuestionGroup;
  input: AnswerQuestionGroupInput;
}

/** Sends one answer to every fan who asked and/or pins it; their pitches show Replied. */
export function useAnswerQuestionGroup() {
  const queryClient = useQueryClient();
  return useGroupMutation<AnswerVars>(
    async ({ group, input }) => {
      const answered = await answerQuestionGroup(group.id, input);
      // The askers' pitches are replied now: fan mail lists refetch.
      queryClient.invalidateQueries({ queryKey: inboxKeys.all });
      return answered;
    },
    ({ group, input }) =>
      (current) => ({
        ...current,
        status: 'answered',
        answer: input.answer,
        answeredAt: new Date().toISOString(),
        pinnedIn: group.communities
          .filter((community) => input.pinCommunityIds?.includes(community.id))
          .map((community) => community.name),
      }),
  );
}

/** Dismisses a group; its messages stay in fan mail as they are. */
export function useDismissQuestionGroup() {
  return useGroupMutation<{ group: QuestionGroup }>(
    ({ group }) => dismissQuestionGroup(group.id),
    () => (current) => ({ ...current, status: 'dismissed' }),
  );
}

/** "Not this one": takes one pitch out of the group for good. */
export function useRemoveQuestionGroupAsker() {
  const queryClient = useQueryClient();
  return useGroupMutation<{ group: QuestionGroup; pitchId: string }>(
    async ({ group, pitchId }) => {
      const updated = await removeQuestionGroupAsker(group.id, pitchId);
      queryClient.invalidateQueries({ queryKey: inboxKeys.all });
      return updated;
    },
    ({ pitchId }) =>
      (current) => ({
        ...current,
        askers: current.askers.filter((asker) => asker.pitchId !== pitchId),
        askedCount: Math.max(0, current.askedCount - 1),
      }),
  );
}

/**
 * A fresh AI draft (not optimistic: the draft comes from the server). The group's draft and
 * redrafts left update in the cache; a failure toasts and keeps the current answer.
 */
export function useRedraftQuestionGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (group: QuestionGroup) => redraftQuestionGroup(group.id),
    onSuccess: (result, group) =>
      queryClient.setQueryData<QuestionGroupsPage>(
        questionGroupKeys.all,
        (page) =>
          page && {
            items: page.items.map((item) =>
              item.id === group.id
                ? { ...item, draft: result.draft, redraftsLeft: result.redraftsLeft }
                : item,
            ),
          },
      ),
    onError: (error) => toastError(error, { fallback: 'Could not draft a new answer.' }),
  });
}
