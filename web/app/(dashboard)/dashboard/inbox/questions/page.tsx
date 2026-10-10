import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { QuestionGroupsView } from '@/components/dashboard/inbox/question-groups-view';
import { routes } from '@/lib/routes';
import { getStudioSpace } from '@/lib/server-api';

export const metadata: Metadata = { title: 'What fans want' };

// The view loads the groups (Answer Once API). Reading the query also renders the page per request, so
// the view's useSearchParams holds the same values.
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await searchParams;
  const result = await getStudioSpace();
  if ('error' in result) {
    redirect(
      result.error === 'unauthorized'
        ? routes.auth.login(routes.dashboard.questions())
        : routes.onboarding(),
    );
  }
  return <QuestionGroupsView handle={result.space.handle} now={Date.now()} />;
}
