import { LIMITS } from '@fellow-owners/shared';
import type { Metadata } from 'next';
import { MakeItBanner } from '@/components/dashboard/promote/make-it-banner';
import { PromotionsScreen } from '@/components/dashboard/promote/promotions-screen';
import type { PromotionsTab } from '@/components/dashboard/promote/promotions-table';
import { TabBar } from '@/components/shared/tab-bar';
import { routes, withQuery } from '@/lib/routes';

export const metadata: Metadata = { title: 'Spotlight' };

const TABS: { value: PromotionsTab; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'live', label: 'Live' },
  { value: 'drafts', label: 'Drafts' },
  { value: 'unpublished', label: 'Taken down' },
];

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const { tab, title } = await searchParams;
  const current = TABS.find((t) => t.value === tab)?.value ?? 'all';
  // ?title= comes from "Make it" on What fans want: the request to make, kept to a headline's length.
  const making = (typeof title === 'string' ? title.trim() : '').slice(
    0,
    LIMITS.promotion.headline.max,
  );

  return (
    <div className="flex flex-col gap-4">
      <h1 className="sr-only">Spotlight</h1>
      {making ? <MakeItBanner title={making} /> : null}
      <TabBar
        label="Spotlight views"
        tabs={TABS.map((t) => ({
          href: withQuery(routes.dashboard.promote(), { tab: t.value }, { tab: 'all' }),
          label: t.label,
          active: t.value === current,
        }))}
      />
      <PromotionsScreen tab={current} />
    </div>
  );
}
