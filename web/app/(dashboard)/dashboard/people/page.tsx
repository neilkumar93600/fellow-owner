import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PeopleContainer, PeopleSkeleton } from '@/components/dashboard/people/people-container';

export const metadata: Metadata = { title: 'Fans' };

export default function Page() {
  // The container reads the URL on the client, so it sits under Suspense.
  return (
    <Suspense fallback={<PeopleSkeleton />}>
      <PeopleContainer now={Date.now()} />
    </Suspense>
  );
}
