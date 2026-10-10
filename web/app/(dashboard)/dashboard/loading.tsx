'use client';

import { usePathname } from 'next/navigation';
import { TodaySkeleton } from '@/components/dashboard/today/today-view';
import { Skeleton } from '@/components/ui/skeleton';
import { routes } from '@/lib/routes';

// The content area while a dashboard screen streams in; the shell around it stays put. Today, whose
// folder this is, gets its own shape. This boundary also covers every screen below /dashboard that ships
// no loading.tsx of its own (the Inbox table does), and those keep the generic band and cards.
export default function Loading() {
  const pathname = usePathname();
  if (pathname === routes.dashboard.today()) return <TodaySkeleton />;
  return (
    <div aria-busy="true" className="flex flex-col gap-4">
      <span className="sr-only" role="status">
        Loading
      </span>
      <Skeleton className="h-16" />
      <div className="grid grid-cols-12 gap-5">
        <Skeleton className="col-span-12 h-72 rounded-card lg:col-span-4" />
        <Skeleton className="col-span-12 h-72 rounded-card lg:col-span-8" />
        <Skeleton className="col-span-12 h-56 rounded-card" />
      </div>
    </div>
  );
}
