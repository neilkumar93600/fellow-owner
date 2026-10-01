import type { Metadata } from 'next';
import { ComingSoon } from '@/components/shared/coming-soon';

// Placeholder until this screen is built (see docs/03-app-flow.md).
export const metadata: Metadata = { title: 'Enter your code' };

export default function Page() {
  return <ComingSoon title="Enter your code" description="Type the 6-digit code we emailed you." />;
}
