'use client';

import { usePathname } from 'next/navigation';
import { TabBar } from '@/components/shared/tab-bar';
import { routes } from '@/lib/routes';

/** Fans (joined your space) | Followers (the imported roster), above both pages. */
export function PeopleTabs({ className }: { className?: string }) {
  const pathname = usePathname();
  const followers = routes.dashboard.followers();
  const onFollowers = pathname === followers || pathname.startsWith(`${followers}/`);
  return (
    <TabBar
      label="Fans views"
      className={className}
      tabs={[
        { href: routes.dashboard.people(), label: 'Fans', active: !onFollowers },
        { href: followers, label: 'Followers', active: onFollowers },
      ]}
    />
  );
}
