import { INBOX_TABS } from '@fellow-owners/shared';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { InboxWithQuestions } from '@/components/dashboard/inbox/inbox-with-questions';
import { routes } from '@/lib/routes';
import { getStudioSpace } from '@/lib/server-api';

export const metadata: Metadata = { title: 'Fan mail' };

// The page reads the space (bio link, read receipts); the view loads the pitches and question groups. Reading the
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
  return (
    <InboxWithQuestions
      tab={INBOX_TABS.find((value) => value === tab) ?? 'all'}
      bioLink={routes.fan.space(space.handle)}
      showReadReceipts={space.showReadReceipts ?? true}
      now={Date.now()}
    />
  );
}
