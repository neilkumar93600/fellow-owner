import type { Metadata } from 'next';
import { ComingSoon } from '@/components/shared/coming-soon';

// Placeholder until this screen is built (see docs/03-app-flow.md).
export const metadata: Metadata = { title: 'Featured project' };

export default function Page() {
  return (
    <ComingSoon
      title="Featured project"
      description="A project the creator put their reach behind."
    />
  );
}
