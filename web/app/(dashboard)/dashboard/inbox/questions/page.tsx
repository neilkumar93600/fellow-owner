import { Lightbulb } from 'lucide-react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { QuestionGroupsView } from '@/components/dashboard/inbox/question-groups-view';
import { EmptyState } from '@/components/shared/empty-state';
import { fixtures } from '@/lib/fixtures';
import { routes } from '@/lib/routes';
import { getStudioSpace } from '@/lib/server-api';

export const metadata: Metadata = { title: 'What fans want' };

// ponytail: still fixture-backed for the demo space; an API arrives with Answer Once. Every other space
// gets an honest empty state. Reading the query also renders the page per request, so the view's
// useSearchParams holds the same values.
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
  const { space } = result;
  if (!space.isDemo) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="sr-only">What fans want</h1>
        <section aria-label="What fans want" className="glass-strong rounded-panel">
          <EmptyState
            icon={Lightbulb}
            title="What fans want arrives after the pilot"
            body="When many fans ask for the same thing, you will see it here with a count, and can make it once for everyone."
            className="min-h-[480px]"
          />
        </section>
      </div>
    );
  }
  return (
    <QuestionGroupsView groups={fixtures.questionGroups} handle={space.handle} now={Date.now()} />
  );
}
