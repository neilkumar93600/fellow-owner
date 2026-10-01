import type { Metadata } from 'next';
import { ComingSoon } from '@/components/shared/coming-soon';

// Placeholder until this screen is built (see docs/03-app-flow.md).
export const metadata: Metadata = { title: 'Community feed' };

export default function Page() {
  return (
    <ComingSoon
      title="Community feed"
      description="Ideas, projects and discussions from this community."
    />
  );
}
