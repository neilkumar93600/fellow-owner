import { INBOX_TABS } from '@fellow-owners/shared';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { InboxView } from '@/components/dashboard/inbox/inbox-view';
import { fixtures } from '@/lib/fixtures';
import { routes } from '@/lib/routes';
import { getStudioSpace } from '@/lib/server-api';

export const metadata: Metadata = { title: 'Fan mail' };

// The page reads the space (bio link, read receipts, demo flag); the view loads the pitches. Reading the
// query also renders the page per request, so the view's useSearchParams holds the same values on the server.
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { tab } = await searchParams;
  const result = await getStudioSpace();
  if ('error' in result) {
    redirect(
      result.error === 'unauthorized'
        ? routes.auth.login(routes.dashboard.inbox())
        : routes.onboarding(),
    );
  }
  const { space } = result;
  // "What fans want" has no API yet: only the demo space shows its canned requests.
  const open = space.isDemo
    ? fixtures.questionGroups.filter((group) => group.status === 'open')
    : [];
  return (
    <InboxView
      tab={INBOX_TABS.find((value) => value === tab) ?? 'all'}
      bioLink={routes.fan.space(space.handle)}
      questions={
        open.length > 0
          ? { groups: open.length, people: open.reduce((sum, group) => sum + group.askedCount, 0) }
          : null
      }
      showReadReceipts={space.showReadReceipts ?? true}
      now={Date.now()}
    />
  );
}
