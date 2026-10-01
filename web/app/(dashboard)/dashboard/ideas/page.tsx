import type { Metadata } from 'next';
import { ComingSoon } from '@/components/shared/coming-soon';

// Placeholder until this screen is built (see docs/03-app-flow.md).
export const metadata: Metadata = { title: 'Ideas' };

export default function Page() {
  return (
    <ComingSoon
      title="Ideas"
      description="Community ideas and projects, ranked by fit, signals and recency."
    />
  );
}
