import type { Metadata } from 'next';
import { ComingSoon } from '@/components/shared/coming-soon';

// Placeholder until this screen is built (see docs/03-app-flow.md).
export const metadata: Metadata = { title: 'About Fellow Owners' };

export default function Page() {
  return (
    <ComingSoon
      title="About Fellow Owners"
      description="Who we build for, and why followers deserve to be fellow owners."
    />
  );
}
