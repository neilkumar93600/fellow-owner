import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AccountSettings } from '@/components/account/account-settings';
import { FanShell } from '@/components/layout/fan-shell';
import { PageHeading } from '@/components/shared/page-heading';
import { buttonVariants } from '@/components/ui/button-variants';
import { routes } from '@/lib/routes';
import { getStudioSpace } from '@/lib/server-api';

export const metadata: Metadata = {
  title: 'Account',
  robots: { index: false, follow: false },
};

// The signed-in person's own account (fans; creators also have it under Settings > Account).
// A static segment, so it wins over /[handle] (C3: `account` is a reserved handle). If the API is
// down the page still renders; each card reports its own failure.
export default async function AccountPage() {
  const gate = await getStudioSpace().catch(() => null);
  if (gate && 'error' in gate && gate.error === 'unauthorized') {
    redirect(routes.auth.login(routes.fan.account()));
  }
  return (
    <FanShell
      topbar={
        <Link
          href={routes.home()}
          className={`${buttonVariants({ variant: 'secondary', surface: 'glass', size: 'md' })} mb-4 self-start`}
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Back to Fellow Owners
        </Link>
      }
    >
      <PageHeading
        title="Account"
        description="Your password, devices, emails and data."
        className="mb-6"
      />
      <div className="grid grid-cols-12 gap-5">
        <AccountSettings ownsSpace={Boolean(gate && 'space' in gate)} />
      </div>
    </FanShell>
  );
}
