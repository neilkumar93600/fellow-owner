import type { Metadata } from 'next';
import type { MySpaceTab } from '@/components/me/my-space';
import { MySpaceContainer } from '@/components/me/my-space-container';

export const metadata: Metadata = { title: 'My space' };

// Kept here, not imported from the client view: a server page cannot read a client module's values.
const TABS: readonly MySpaceTab[] = ['posts', 'teams', 'pitches'];

type Props = {
  params: Promise<{ handle: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function MySpacePage({ params, searchParams }: Props) {
  const [{ handle }, query] = await Promise.all([params, searchParams]);
  const tab = TABS.find((value) => value === query.tab) ?? 'posts';
  return <MySpaceContainer handle={handle} tab={tab} />;
}
