import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { SettingsClient } from '@/components/dashboard/settings/settings-client';
import { routes } from '@/lib/routes';
import { getStudioSpace } from '@/lib/server-api';

export const metadata: Metadata = { title: 'Settings' };

const TABS = [
  { value: 'profile', label: 'Profile' },
  { value: 'taste', label: 'What you love' },
  { value: 'bio-link', label: 'Bio link' },
  { value: 'import', label: 'Import audience' },
  { value: 'account', label: 'Account' },
] as const;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const { tab } = await searchParams;
  const current = TABS.find((t) => t.value === tab)?.value ?? 'profile';
  // The server reads the space with the visitor's cookies; the client fetcher has no origin here.
  const result = await getStudioSpace();
  if ('error' in result) {
    redirect(
      result.error === 'unauthorized'
        ? routes.auth.login(routes.dashboard.settings())
        : routes.onboarding(),
    );
  }
  const { space } = result;

  return (
    <SettingsClient
      space={space}
      current={current}
      tabs={TABS.map((t) => ({
        href: routes.dashboard.settings({ tab: t.value }),
        label: t.label,
        active: t.value === current,
      }))}
    />
  );
}
