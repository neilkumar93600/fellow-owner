import { CardsSkeleton } from '@/components/dashboard/inbox/inbox-cards';
import { Skeleton } from '@/components/ui/skeleton';

// Fan mail while it loads, in its own shape (The Same Shape Rule): the tab bar and toolbar bands, four
// message cards, and the pagination pill.
export default function Loading() {
  return (
    <div aria-busy="true" className="flex flex-col gap-4">
      <span className="sr-only" role="status">
        Loading
      </span>
      <div className="glass flex h-16 items-center gap-10 overflow-hidden rounded-full px-6 lg:gap-12">
        {['w-6', 'w-14', 'w-20', 'w-10', 'w-10', 'w-16', 'w-16'].map((width, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: placeholders with no identity
          <Skeleton key={i} className={`h-3 shrink-0 ${width}`} />
        ))}
      </div>
      <div className="glass flex h-18 items-center justify-between gap-3 rounded-full p-4 max-sm:rounded-card">
        <Skeleton className="ml-2 h-3 w-20" />
        <div className="flex gap-3">
          <Skeleton className="size-10 rounded-sm" />
          <Skeleton className="h-10 w-28 rounded-sm" />
          <Skeleton className="h-10 w-32 rounded-sm max-sm:hidden" />
        </div>
      </div>
      <CardsSkeleton />
      <Skeleton className="h-10 w-72 max-w-full rounded-full" />
    </div>
  );
}
