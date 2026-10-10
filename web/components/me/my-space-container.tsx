'use client';

import { Banner } from '@/components/shared/banner';
import { Skeleton } from '@/components/ui/skeleton';
import { useMe } from '@/hooks/queries/use-me';
import { type MySpaceTab, MySpaceView } from './my-space';

export interface MySpaceContainerProps {
  handle: string;
  tab: MySpaceTab;
}

export function MySpaceContainer({ handle, tab }: MySpaceContainerProps) {
  const { data, isLoading, error } = useMe(handle);

  if (error) {
    return <Banner>Failed to load your space. Please try again.</Banner>;
  }

  if (isLoading || !data) {
    return (
      <div aria-busy="true" className="flex flex-col gap-4">
        <span className="sr-only" role="status">
          Loading
        </span>
        {/* Profile card skeleton */}
        <div className="min-w-0 glass-strong p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-4">
            <Skeleton className="size-12 rounded-md" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-7 w-40" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
          <Skeleton className="mt-5 h-16 w-full" />
        </div>
        {/* Tabs skeleton */}
        <Skeleton className="h-10 w-48" />
        {/* Content skeleton */}
        <div className="space-y-4">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
      </div>
    );
  }

  return <MySpaceView handle={handle} data={data} tab={tab} />;
}
