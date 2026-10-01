import type { Metadata } from 'next';
import { ComingSoon } from '@/components/shared/coming-soon';

// Placeholder until this screen is built (see docs/03-app-flow.md).
export const metadata: Metadata = { title: 'Send a pitch' };

export default function Page() {
  return (
    <ComingSoon
      title="Send a pitch"
      description="A structured message the creator actually reads."
    />
  );
}
