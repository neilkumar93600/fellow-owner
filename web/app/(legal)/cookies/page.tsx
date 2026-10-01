import type { Metadata } from 'next';
import { ComingSoon } from '@/components/shared/coming-soon';

// Placeholder until this screen is built (see docs/03-app-flow.md).
export const metadata: Metadata = { title: 'Cookie policy' };

export default function Page() {
  return (
    <ComingSoon
      title="Cookie policy"
      description="The few cookies we use to keep you signed in, and nothing else."
    />
  );
}
