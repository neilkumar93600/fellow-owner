import type { Metadata } from 'next';
import { ComingSoon } from '@/components/shared/coming-soon';

// Placeholder until this screen is built (see docs/03-app-flow.md).
export const metadata: Metadata = { title: 'Today' };

export default function Page() {
  return (
    <ComingSoon
      title="Today"
      description="Your AI briefing, stats and the ideas worth your time."
    />
  );
}
