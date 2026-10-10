'use client';

import { useQuestionGroups } from '@/hooks/queries/use-question-groups';
import { InboxView, type InboxViewProps } from './inbox-view';

/**
 * Fan mail with the "What fans want" strip fed by the Answer Once API: the open groups and how many
 * fans asked in them. The strip stays hidden while loading, on error, and when nothing is open.
 */
export function InboxWithQuestions(props: Omit<InboxViewProps, 'questions'>) {
  const { data } = useQuestionGroups();
  const open = (data?.items ?? []).filter((group) => group.status === 'open');
  const questions =
    open.length > 0
      ? { groups: open.length, people: open.reduce((sum, group) => sum + group.askedCount, 0) }
      : null;
  return <InboxView {...props} questions={questions} />;
}
