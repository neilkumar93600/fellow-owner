import type { Metadata } from 'next';
import { Suspense } from 'react';
import {
  FollowersContainer,
  FollowersSkeleton,
} from '@/components/dashboard/followers/followers-container';

export const metadata: Metadata = { title: 'Followers' };

export default function Page() {
  // The container reads the URL on the client, so it sits under Suspense.
  return (
    <Suspense fallback={<FollowersSkeleton />}>
      <FollowersContainer now={Date.now()} />
    </Suspense>
  );
}
